ssh root@121.40.167.71 bash -lc 'sudo mkdir -p /etc/docker && \
sudo tee /etc/docker/daemon.json >/dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com"
  ],
  "ipv6": false
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker && sleep 2 && \
docker info --format "{{json .RegistryConfig.IndexConfigs}}"'