import { resolve } from "node:path";
import { readGlyph, writeGlyph, renderGlyph } from "./local-project.js";

export default {
  plugins: [
    {
      name: "lattice-local-file",
      configureServer(server) {
        const file = resolve(server.config.root, "glyphs/current.glyph");
        let renderedRevision;
        server.middlewares.use("/__glyph", async (req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          const send = (status, value) => {
            res.statusCode = status;
            res.end(JSON.stringify(value));
          };
          if (
            req.headers.origin &&
            req.headers.origin !== `http://${req.headers.host}`
          )
            return send(403, {
              error: "Only the local editor may access this file.",
            });
          if (!["GET", "PUT"].includes(req.method))
            return send(405, { error: "Use GET or PUT." });
          try {
            let project;
            if (req.method === "PUT") {
              if (req.headers["content-type"] !== "application/json")
                return send(415, { error: "Expected application/json." });
              let body = "";
              for await (const chunk of req) {
                body += chunk;
                if (body.length > 20_000)
                  return send(413, { error: "Drawing is too large." });
              }
              const { design, revision } = JSON.parse(body);
              project = writeGlyph(file, design, revision);
              if (!project)
                return send(409, {
                  error:
                    "File changed elsewhere. Local sync paused; save your browser drawing before reloading.",
                });
            } else project = readGlyph(file);
            if (project.revision !== renderedRevision) {
              renderGlyph(file, project.design);
              renderedRevision = project.revision;
            }
            send(200, project);
          } catch (error) {
            send(error.code ? 500 : 400, { error: error.message });
          }
        });
      },
    },
  ],
};
