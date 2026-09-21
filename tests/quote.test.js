const test=require('node:test');const assert=require('node:assert/strict');
const {validateAttachments}=require('../api/_lib/attachments');
test('attachment validation accepts supported signatures and rejects disguised or oversized files',()=>{
 const pdf={filename:'artwork.pdf',content:Buffer.from('%PDF-1.7\nartwork').toString('base64')};
 assert.equal(validateAttachments([pdf])[0].filename,'artwork.pdf');
 assert.throws(()=>validateAttachments([{...pdf,filename:'artwork.png'}]));
 assert.throws(()=>validateAttachments([{filename:'large.pdf',content:Buffer.concat([Buffer.from('%PDF-'),Buffer.alloc(2*1024*1024)]).toString('base64')}]));
 assert.throws(()=>validateAttachments(Array(4).fill(pdf)));
 assert.deepEqual(validateAttachments(undefined),[]);
});
test('quote accepts optional company and passes artwork through existing mail integration',async()=>{
 const mail=require('../api/_lib/mail');let sent;
 const original={...mail};Object.assign(mail,{rateLimitOk:()=>true,emailCooldownOk:()=>true,bothSent:()=>false,emailConfigReady:()=>true,sendEnquiryPair:async x=>{sent=x;},markEmailCooldown:()=>{}});
 delete require.cache[require.resolve('../api/quote')];const handler=require('../api/quote');
 const req={method:'POST',headers:{},body:{name:'QA',email:'qa@example.com',destination:'US',quantity:2,brief:'Test enquiry',attachments:[{filename:'art.pdf',content:Buffer.from('%PDF-1.7').toString('base64')}]}};
 const res={status(n){this.code=n;return this;},json(data){this.data=data;},setHeader(){}};
 await handler(req,res);assert.equal(res.code,200);assert.equal(sent.internal.attachments.length,1);assert.ok(sent.submissionId);
 Object.assign(mail,original);
});
