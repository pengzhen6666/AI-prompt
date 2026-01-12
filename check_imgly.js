
import * as imgly from "@imgly/background-removal";
console.log("Keys:", Object.keys(imgly));
console.log("Default:", imgly.default);
try {
    console.log("Type of default:", typeof imgly.default);
} catch (e) { }
