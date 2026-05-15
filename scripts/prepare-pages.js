const fs = require("fs");
const path = require("path");

const outputDir = path.join(process.cwd(), "dist");
const basePath = (process.env.EXPO_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

if (!basePath) {
  process.exit(0);
}

for (const fileName of ["index.html", "404.html"]) {
  const filePath = path.join(outputDir, fileName);
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const html = fs
    .readFileSync(filePath, "utf8")
    .replace(/(src|href)="\/_expo\//g, `$1="${basePath}/_expo/`);

  fs.writeFileSync(filePath, html);
}
