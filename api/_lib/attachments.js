'use strict';
function validateAttachments(raw) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 3) throw new Error('Invalid files');
  let total = 0;
  return raw.map(file => {
    if (!file || typeof file.filename !== 'string' || typeof file.content !== 'string' || file.content.length > 2800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(file.content)) throw new Error('Invalid file');
    const ext = file.filename.split('.').pop().toLowerCase();
    const data = Buffer.from(file.content, 'base64');
    const signatures = {jpg:'ffd8ff', jpeg:'ffd8ff', png:'89504e470d0a1a0a', pdf:'255044462d', zip:'504b'};
    total += data.length;
    if (!signatures[ext] || !data.length || total > 2 * 1024 * 1024 || !data.toString('hex', 0, 8).startsWith(signatures[ext])) throw new Error('Invalid file');
    return {filename:file.filename.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120),content:data.toString('base64')};
  });
}
module.exports = {validateAttachments};
