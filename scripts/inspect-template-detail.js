const ExcelJS = require("exceljs");
const path = process.argv[2] || "c:\\Users\\krian\\Downloads\\Professional_Data_Dictionary_Template.xlsx";

const wb = new ExcelJS.Workbook();
wb.xlsx
  .readFile(path)
  .then(() => {
    wb.worksheets.forEach((sheet) => {
      console.log("\n=== Sheet:", sheet.name, "===");
      const cols = sheet.columns || [];
      cols.forEach((col, i) => {
        if (col && col.width) console.log("  Col " + (i + 1) + " width:", col.width);
      });
      for (let r = 1; r <= Math.min((sheet.rowCount || 0), 8); r++) {
        const row = sheet.getRow(r);
        if (row.height) console.log("  Row " + r + " height:", row.height);
      }
      // Sample cell styles from table sheet
      if (sheet.name !== "Cover" && sheet.name !== "Table Index") {
        const r5 = sheet.getRow(5);
        r5.eachCell((c, colNumber) => {
          const info = [];
          if (c.fill && c.fill.fgColor) info.push("fill:" + (c.fill.fgColor.argb || ""));
          if (c.font) info.push("font:" + JSON.stringify(c.font));
          if (c.border && Object.keys(c.border).length) info.push("border:yes");
          if (c.alignment) info.push("align:" + JSON.stringify(c.alignment));
          if (info.length) console.log("  Row5 Cell(" + colNumber + "):", info.join(" "));
        });
        const r6 = sheet.getRow(6);
        r6.eachCell((c, colNumber) => {
          if (c.border && Object.keys(c.border).length) console.log("  Row6 Cell(" + colNumber + ") has border");
        });
      }
    });
  })
  .catch((e) => console.error(e));
