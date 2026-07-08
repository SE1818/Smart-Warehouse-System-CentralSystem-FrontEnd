const fs = require('fs');

function addA11y(filepath, searchStr, attrLines) {
  let t = fs.readFileSync(filepath, 'utf8');
  if (!t.includes(searchStr)) {
    console.log('String not found in', filepath, '- searching for:', searchStr.substring(0, 60));
    return false;
  }
  const replacement = searchStr + '\n' + attrLines;
  t = t.replace(searchStr, replacement);
  fs.writeFileSync(filepath, t, 'utf8');
  console.log('Fixed:', filepath);
  return true;
}

// 1. TransferDetailDrawer backdrop (already fixed manually, skip)
// 2. NotificationsPage backdrop
addA11y(
  'src/pages/NotificationsPage.tsx',
  "onClick={() => setIsModalOpen(false)}",
  "        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setIsModalOpen(false); }}\n        role=\"button\"\n        tabIndex={0}\n        aria-label=\"Đóng modal gửi thông báo\""
);

// 3. ComplaintsPage - complaint item clickable div
addA11y(
  'src/pages/admin/ComplaintsPage.tsx',
  "onClick={() => {\n          setSelectedComplaint(item);\n          setResponse('');\n        }}",
  "onClick={() => {\n          setSelectedComplaint(item);\n          setResponse('');\n        }}\n        onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedComplaint(item); setResponse(''); } }}\n        role=\"button\"\n        tabIndex={0}\n        aria-label=\"Xem chi tiết khiếu nại\""
);

// 4. StoresPage - store card clickable div
addA11y(
  'src/pages/admin/StoresPage.tsx',
  "onClick={() => setSelectedStore(store)}",
  "onClick={() => setSelectedStore(store)}\n        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedStore(store); }}\n        role=\"button\"\n        tabIndex={0}\n        aria-label=\"Xem sản phẩm cửa hàng\""
);

console.log('All done');
