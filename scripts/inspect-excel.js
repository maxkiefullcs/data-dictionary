const ExcelJS = require("exceljs");
const path = process.argv[2] || "c:\\Users\\krian\\Downloads\\Professional_Data_Dictionary_Template.xlsx";

const wb = new ExcelJS.Workbook();
wb.xlsx
  .readFile(path)
  .then(() => {
    console.log("Sheets:", wb.worksheets.map((s) => s.name));
    wb.worksheets.forEach((sheet) => {
      console.log("\n=== Sheet:", sheet.name, "===");
      const rowCount = Math.min(sheet.rowCount || 0, 20);
      for (let r = 1; r <= rowCount; r++) {
        const row = sheet.getRow(r);
        const vals = [];
        row.eachCell({ includeEmpty: true }, (c, colNumber) => {
          let v = c.value;
          if (v != null && typeof v === "object" && v.text) v = v.text;
          vals.push(String(v ?? "").slice(0, 50));
        });
        if (vals.some((x) => x)) console.log("Row" + r, vals.join(" | "));
      }
      const r1 = sheet.getRow(1);
      r1.eachCell((c, colNumber) => {
        const info = [];
        if (c.fill && c.fill.fgColor) info.push("fill:" + (c.fill.fgColor.argb || c.fill.fgColor.theme));
        if (c.font) info.push("font:" + JSON.stringify(c.font).slice(0, 60));
        if (info.length) console.log("  Cell(1," + colNumber + ")", info.join(" "));
      });
    });
  })
  .catch((e) => console.error(e.message));
