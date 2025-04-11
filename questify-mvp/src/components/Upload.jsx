import React, { useState } from 'react';

function Upload({ onNotesSubmitted }) {
  const [notes, setNotes] = useState('');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        setNotes(fileContent);
        // Automatically submit when file is loaded
        if (onNotesSubmitted && fileContent) {
            onNotesSubmitted(fileContent);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a .txt file.');
    }
  };

  const handleTextChange = (event) => {
    setNotes(event.target.value);
  };

  const handleSubmit = () => {
    if (onNotesSubmitted && notes.trim()) {
      onNotesSubmitted(notes.trim());
    } else {
        alert("Please upload a file or paste some notes.");
    }
  };

  const loadTestData = () => {
    const testNotes = `How does photosynthesis work in plants?
    What are the three main components of an atom?
    The capital of France is Paris.
    DNA stands for deoxyribonucleic acid.
    The mitochondria is known as the powerhouse of the cell.
    Water is composed of hydrogen and oxygen.
    The Earth revolves around the sun.
    Who wrote the novel Pride and Prejudice?
    The American Civil War ended in 1865.
    What is the chemical formula for water?`;
    
    setNotes(testNotes);
    onNotesSubmitted(testNotes);
  };

  return (
    <div>
      <h2>Upload Your Study Notes</h2>
      <div>
        <label htmlFor="file-upload">Upload a .txt file:</label>
        <input
          id="file-upload"
          type="file"
          accept=".txt"
          onChange={handleFileChange}
        />
      </div>
      <p>OR</p>
      <div>
        <label htmlFor="notes-textarea">Paste your notes here:</label>
        <br />
        <textarea
          id="notes-textarea"
          rows="10"
          cols="50"
          value={notes}
          onChange={handleTextChange}
          placeholder="Paste your study notes..."
        />
      </div>
      
      {/* Quick start button for testing */}
      <div style={{ marginTop: '10px', marginBottom: '10px' }}>
        <button onClick={loadTestData} style={{ backgroundColor: '#4CAF50', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Quick Start (Load Test Data)
        </button>
      </div>
      
      {/* Only show submit button if text area was used */}
      {notes && !document.getElementById('file-upload')?.files?.length > 0 && (
         <button onClick={handleSubmit}>Start Studying!</button>
      )}
       {/* Display message if file was uploaded and processed */}
       {notes && document.getElementById('file-upload')?.files?.length > 0 && (
            <p>Notes loaded from file. Ready to start!</p>
       )}
    </div>
  );
}

export default Upload;
