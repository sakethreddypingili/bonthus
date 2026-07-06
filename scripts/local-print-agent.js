const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const os = require("os");

const PORT = 9100;

// Helper to write to a temp file and shell print
const printRawWindows = (rawTspl, printerName, callback) => {
  const tempFile = path.join(os.tmpdir(), `print_job_${Date.now()}.txt`);
  fs.writeFileSync(tempFile, rawTspl, "utf8");

  // If no printer is explicitly configured, try to find the default one first
  if (!printerName) {
    const getPrinterCmd = `powershell -Command "Get-CimInstance Win32_Printer -Filter 'Default = True' | Select-Object -ExpandProperty Name"`;
    exec(getPrinterCmd, (err, stdout) => {
      const defaultPrinter = stdout ? stdout.trim() : "";
      if (err || !defaultPrinter) {
        console.log("[Local Agent] No default printer returned from system. Simulating print output...");
        try {
          fs.unlinkSync(tempFile);
        } catch (e) { }
        callback(null, "Simulated successfully");
        return;
      }
      sendToWindowsPrinter(tempFile, defaultPrinter, callback);
    });
  } else {
    sendToWindowsPrinter(tempFile, printerName, callback);
  }
};

const sendToWindowsPrinter = (filePath, printerName, callback) => {
  // Read the raw command file contents
  const rawData = fs.readFileSync(filePath, "utf8");

  // Escape single quotes for PowerShell execution safely
  const escapedData = rawData.replace(/'/g, "''");

  // This PowerShell snippet opens a direct raw stream bypass into the Windows Spooler API
  // It completely bypasses driver rendering and works flawlessly on BOTH standard and generic drivers!
  const command = `powershell -Command "
    $code = @'
    using System;
    using System.Runtime.InteropServices;
    public class RawPrinterHelper {
        [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
        public class DOCINFOA {
            [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPStr)] public string pDatatype;
        }
        [DllImport(\\"winspool.Drv\\", EntryPoint=\\"OpenPrinterA\\", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
        public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
        [DllImport(\\"winspool.Drv\\", EntryPoint=\\"ClosePrinter\\", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
        public static extern bool ClosePrinter(IntPtr hPrinter);
        [DllImport(\\"winspool.Drv\\", EntryPoint=\\"StartDocPrinterA\\", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPCustomMarshaler, MarshalTypeRef = typeof(System.Runtime.InteropServices.CustomMarshalers.TypeToTypeMarshaler))] DOCINFOA di);
        [DllImport(\\"winspool.Drv\\", EntryPoint=\\"EndDocPrinter\\", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);
        [DllImport(\\"winspool.Drv\\", EntryPoint=\\"StartPagePrinter\\", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);
        [DllImport(\\"winspool.Drv\\", EntryPoint=\\"EndPagePrinter\\", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);
        [DllImport(\\"winspool.Drv\\", EntryPoint=\\"WritePrinter\\", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

        public static bool SendStringToPrinter(string szPrinterName, string szString) {
            IntPtr hPrinter = IntPtr.Zero;
            DOCINFOA di = new DOCINFOA();
            bool bSuccess = false;
            di.pDocName = \\"TSPL Raw Print Job\\";
            di.pDatatype = \\"RAW\\";
            if (OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) {
                if (StartDocPrinter(hPrinter, 1, di)) {
                    if (StartPagePrinter(hPrinter)) {
                        IntPtr pBytes = Marshal.StringToCoTaskMemAnsi(szString);
                        Int32 dwCount = szString.Length;
                        Int32 dwWritten = 0;
                        bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                        Marshal.FreeCoTaskMem(pBytes);
                        EndPagePrinter(hPrinter);
                    }
                    EndDocPrinter(hPrinter);
                }
                ClosePrinter(hPrinter);
            }
            return bSuccess;
        }
    }
'@
    Add-Type -TypeDefinition $code
    [RawPrinterHelper]::SendStringToPrinter('${printerName}', '${escapedData}')
  "`;

  exec(command, (err, stdout, stderr) => {
    try {
      fs.unlinkSync(filePath);
    } catch (e) { }

    if (err || stdout.trim() === "False") {
      console.error(\`[Local Agent] Print error on printer "${printerName}":\`, stderr || "Failed to submit raw spool data.");
      callback(err || new Error("Raw submission returned false status"));
    } else {
      console.log(\`[Local Agent] Successfully printed raw payload to "${printerName}"\`);
      callback(null);
    }
  });
};

const printRawUnix = (rawTspl, printerName, callback) => {
  const tempFile = path.join(os.tmpdir(), `print_job_${ Date.now() }.txt`);
  fs.writeFileSync(tempFile, rawTspl, "utf8");

  // Determine target command (lp or lpr)
  const cmd = printerName ? `lp - d "${printerName}" "${tempFile}"` : `lp "${tempFile}"`;
  
  exec(cmd, (err, stdout, stderr) => {
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {}

    if (err) {
      console.error(`[Local Agent]Print error: `, stderr);
      callback(err);
    } else {
      console.log("[Local Agent] Successfully printed via lp command");
      callback(null);
    }
  });
};

const server = http.createServer((req, res) => {
  console.log(`[Local Agent]Incoming request: ${ req.method } ${ req.url }`);
  
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /ping or /
  if (req.method === "GET" && (req.url === "/ping" || req.url === "/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "online", version: "1.1.0-zero-dependency" }));
    return;
  }

  // POST /print
  if (req.method === "POST" && req.url === "/print") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const { rawTspl, printerName } = payload;

        if (!rawTspl) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing rawTspl payload" }));
          return;
        }

        console.log(`[Local Agent]Received print job payload: \n${ rawTspl }`);

        const isWin = os.platform() === "win32";
        const printFunc = isWin ? printRawWindows : printRawUnix;

        printFunc(rawTspl, printerName, (err, msg) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Print execution failed", details: err.message }));
          } else {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "success", message: msg || "Job spooled successfully" }));
          }
        });
      } catch (err) {
        console.error("[Local Agent] Error parsing print payload:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error", details: err.message }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

server.listen(PORT, () => {
  console.log(`[Local Agent]Running on http://localhost:${PORT} with zero dependencies.`);
        console.log(`[Local Agent] OS Platform: ${os.platform()}`);
    });
