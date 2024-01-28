from modal import Mount, asgi_app
from pathlib import Path
import os
import time

# Import modal components
from modal import Image, Stub, gpu, method

# Define constants -> MODAL_DIR, BASE_MODEL, GPU_CONFIG
MODEL_DIR = "/model"
BASE_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1"
# GPU configuration
GPU_CONFIG = gpu.A100(memory=80, count=2)


# Download model weights and store them in the pre-defined directory
def download_model():
    from huggingface_hub import snapshot_download
    from transformers.utils import move_cache

    os.makedirs(MODEL_DIR, exist_ok=True)

    # Download a whole snapshot of a repo's files at the specified revision.
    # This is useful when you want all files from a repo, because you don't know which ones you will need a priori.
    # All files are nested inside a folder in order to keep their actual filename relative to that folder.
    # If local_dir is provided, the file structure from the repo will be replicated in this location. You can configure how you want to move those files:
    snapshot_download(
        BASE_MODEL,
        local_dir=MODEL_DIR,
        ignore_patterns="*.pt",
    )

    move_cache()


# Docker image configuration
# Pull a preconfigured image recommended by vLLM
vllm_image = (
    Image.from_registry(
        "nvidia/cuda:12.1.0-base-ubuntu22.04", add_python="3.10"
    )
    .pip_install("vllm==0.2.5", "huggingface_hub==0.19.4", "hf-transfer==0.1.4")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(download_model, timeout=60 * 20)
)

# Create stub
stub = Stub("lexq-dev")

# Represent inference function with a <Model> class
@stub.cls(
    gpu=GPU_CONFIG,
    timeout=60 * 10,
    container_idle_timeout=60 * 10,
    allow_concurrent_inputs=10,
    image=vllm_image,
)
class Model:
    def __enter__(self):
        from vllm.engine.arg_utils import AsyncEngineArgs
        from vllm.engine.async_llm_engine import AsyncLLMEngine

        if GPU_CONFIG.count > 1:
            import ray

            ray.shutdown()
            # Initialize GPU
            ray.init(num_gpus=GPU_CONFIG.count)

        engine_args = AsyncEngineArgs(
            model=MODEL_DIR,
            tensor_parallel_size=GPU_CONFIG.count,
            gpu_memory_utilization=0.90,
        )

        self.engine = AsyncLLMEngine.from_engine_args(engine_args)
        self.template = "<s> [INST] {user} [/INST] "

        if GPU_CONFIG.count > 1:
            import subprocess
            # Ray pinning -> Performance optimization
            RAY_CORE_PIN_OVERRIDE = "cupid=0 ; for pid in $(ps xo '%p %c' | grep ray:: | awk '{print $1;}') ; do taskset -cp $cpuid $pid ; cpuid=$(($cpuid + 1)) ; done"
            subprocess.call(RAY_CORE_PIN_OVERRIDE, shell=True)

    @method()
    async def completion_stream(self, user_question):
        from vllm import SamplingParams
        from vllm.utils import random_uuid

        sampling_params = SamplingParams(
            temperature=0.75,
            max_tokens=1024,
            repetition_penalty=1.1,  # Values greater than 1 encourage the model to use new tokens
        )

        t0 = time.time()
        request_id = random_uuid()
        result_generator = self.engine.generate(
            self.template.format(user=user_question),
            sampling_params,
            request_id,
        )

        index, num_tokens = 0, 0
        async for output in result_generator:
            if (
                output.outputs[0].text
                and "\ufffd" == output.outputs[0].text[-1]
            ):
                continue
            text_delta = output.outputs[0].text[index:]
            index = len(output.outputs[0].text)
            num_tokens = len(output.outputs[0].token_ids)

            yield text_delta

        # print(f"Generate {num_tokens} tokens in {time.time() - t0:.2f}s")


# Define local entrypoint
# @stub.local_entrypoint()
# def main():
#     model = Model()
#     questions = [
#         "How can I be a valuable Data Engineer"
#     ]

#     # Loop through each question
#     for question in questions:
#         print("User input: ", question)
#         for text in model.completion_stream.remote_gen(question):
#             print(text, end="", flush=True)


# Couple frontend application
frontend_path = Path(__file__).parent / "web-client"


@stub.function(
    mounts=[Mount.from_local_dir(frontend_path, remote_path="/assets")],
    keep_warm=1,
    allow_concurrent_inputs=20,
    timeout=60 * 10,
)
@asgi_app(label="demo-9")
def app():
    import json

    import fastapi
    import fastapi.staticfiles
    from fastapi.responses import StreamingResponse

    web_app = fastapi.FastAPI()

    @web_app.get("/stats")
    async def stats():
        stats = await Model().completion_stream.get_current_stats.aio()
        return {
            "backlog": stats.backlog,
            "num_total_runners": stats.num_total_runners,
            "model": BASE_MODEL + " (vLLM)",
        }

    @web_app.get("/completion/{question}")
    async def completion(question: str):
        from urllib.parse import unquote

        async def generate():
            async for text in Model().completion_stream.remote_gen.aio(
                unquote(question)
            ):
                yield f"data: {json.dumps(dict(text=text), ensure_ascii=False)}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream")

    web_app.mount(
        "/", fastapi.staticfiles.StaticFiles(directory="/assets", html=True)
    )
    return web_app
