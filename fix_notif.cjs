const fs = require('fs');

function fixBackdrop(filepath, label) {
  let t = fs.readFileSync(filepath, 'utf8');
  const search = "onClick={() => setIsModalOpen(false)}";
  const replace = [
    "onClick={() => setIsModalOpen(false)}",
    "        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setIsModalOpen(false); }}",
    "        role=\"button\"",
    "        tabIndex={0}",
    "        aria-label=\"" + label + "\""
  ].join("\\r\\n        ");

  if (!t.includes(search)) {
    console.log('NOT FOUND in', filepath);
    return false;
  }
  t = t.replace(search, replace);
  fs.writeFileSync(filepath, t);
  console.log('Fixed:', filepath);
  return true;
}

function fixTransferDrawerBackdrop(filepath) {
  let t = fs.readFileSync(filepath, 'utf8');
  const search = "onClick={onClose}";
  const replace = [
    "onClick={onClose}",
    "        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); }}",
    "        role=\"button\"",
    "        tabIndex={0}",
    "        aria-label=\"Đóng chi tiết chuyến vận chuyển\""
  ].join("\\r\\n        ");

  if (!t.includes(search)) {
    console.log('NOT FOUND in', filepath);
    return false;
  }
  t = t.replace(search, replace);
  fs.writeFileSync(filepath, t);
  console.log('Fixed:', filepath);
  return true;
}

fixBackdrop('src/pages/NotificationsPage.tsx', 'Đóng modal gửi thông báo');
fixTransferDrawerBackdrop('src/components/TransferDetailDrawer.tsx');
console.log('Done');
