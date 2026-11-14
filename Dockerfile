FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-dejavu-core \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Téléchargement du moteur vocal neuronal local Piper-TTS + 3 modèles ONNX français (Hommes & Femmes)
RUN mkdir -p /app/models/piper && cd /app/models/piper \
  && curl -L -s https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz -o piper.tar.gz \
  && tar -xzf piper.tar.gz && rm piper.tar.gz \
  && curl -L -s https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/tom/medium/fr_FR-tom-medium.onnx -o fr_FR-tom-medium.onnx \
  && curl -L -s https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/tom/medium/fr_FR-tom-medium.onnx.json -o fr_FR-tom-medium.onnx.json \
  && curl -L -s https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx -o fr_FR-upmc-medium.onnx \
  && curl -L -s https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx.json -o fr_FR-upmc-medium.onnx.json \
  && curl -L -s https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx -o fr_FR-siwis-medium.onnx \
  && curl -L -s https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx.json -o fr_FR-siwis-medium.onnx.json

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p data public/media

EXPOSE 3456

CMD ["npm", "start"]

