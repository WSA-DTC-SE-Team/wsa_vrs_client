module.exports = {
    apps: [
        {
            name: "vrs-client",
            script: "npm",
            args: "run start:prod",
            cwd: "./",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
