---
"@batkit/express-middleware": patch
---

error-handler: broaden the binary-body log guard to also cover non-Buffer bodies with a non-JSON content-type (e.g. `text/plain`), not just `Buffer.isBuffer`. Previously only Buffer bodies were kept out of raw error logs; other non-JSON bodies still logged raw.
