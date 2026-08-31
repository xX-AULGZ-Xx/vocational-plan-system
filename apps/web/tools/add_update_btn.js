const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const handleBlock = `  const handleDelete = async (id: number) => {`;
const newHandleBlock = `  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [updatingId, setUpdatingId] = React.useState<number | null>(null);

  const handleUpdateFileClick = (id: number) => {
    setUpdatingId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpdateFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !updatingId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      const res = await fetch(\`/api/v1/admin/templates/\${updatingId}/file\`, {
        method: 'PUT',
        headers: { Authorization: \`Bearer \${token}\` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'อัปเดตไฟล์สำเร็จ');
        fetchTemplates();
      } else {
        setErrorMsg(data.message || 'ไม่สามารถอัปเดตไฟล์ได้');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอัปเดตไฟล์');
    } finally {
      setLoading(false);
      setUpdatingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {`;

const btnBlock = `                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="inline-flex items-center p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>`;
                          
const newBtnBlock = `                          <button
                            onClick={() => handleUpdateFileClick(tpl.id)}
                            className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors mr-1"
                            title="อัปเดตไฟล์ (Upload new version)"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="inline-flex items-center p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>`;

const renderBlock = `  return (
    <div className="max-w-7xl mx-auto space-y-6">`;
    
const newRenderBlock = `  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpdateFileChange} 
        accept=".docx" 
        className="hidden" 
      />`;

// Handle non-standard Thai characters encoding if it's there
if (code.includes(handleBlock)) {
  code = code.replace(handleBlock, newHandleBlock);
  // Using regex for the button to avoid exact thai char match
  code = code.replace(/<button\s+onClick=\{\(\) => handleDelete\(tpl\.id\)\}[\s\S]*?<\/button>/, newBtnBlock);
  code = code.replace(renderBlock, newRenderBlock);
  
  // we also need to import Upload icon from lucide-react if not exists
  if (!code.includes('Upload,') && !code.includes(' Upload ')) {
    code = code.replace('Trash2,', 'Trash2, Upload,');
  }

  fs.writeFileSync('src/app/admin/templates/page.tsx', code);
  console.log('Modified templates page successfully');
} else {
  console.log('Could not find anchor block');
}
