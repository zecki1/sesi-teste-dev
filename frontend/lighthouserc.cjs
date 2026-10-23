module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:5174/",
        "http://localhost:5174/catalogo",
        "http://localhost:5174/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia",
        "http://localhost:5174/curso/matematica-para-a-precisao-medidas-e-escalas-na-metalurgia/scorm",
      ],
      numberOfRuns: 3,
      startServerCommand: "npm run preview -- --host 127.0.0.1 --port 5174 --strictPort",
      startServerReadyPattern: "Local:.*5174",
      startServerTimeout: 30000,
      settings: {
        chromeFlags: ["--no-sandbox", "--disable-dev-shm-usage"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "../.lhci",
    },
  },
}
