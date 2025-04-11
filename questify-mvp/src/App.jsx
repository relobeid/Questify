import { useState, useEffect } from 'react'
import React from 'react'
import './App.css'
import Upload from './components/Upload'
import Game from './components/Game'

// Simple error boundary to help debug issues
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', margin: '20px', padding: '10px', border: '1px solid red' }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.toString()}</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}

function parseNotes(text) {
  // Basic parsing: Split by lines, then filter out empty lines and trim whitespace.
  // We'll treat each non-empty line as a potential question for now.
  if (!text) return []
  return text.split(/[\.\?!\n]+/).filter(sentence => sentence.trim().length > 0).map(s => s.trim())
}

function App() {
  const [studyNotes, setStudyNotes] = useState(null)
  const [questions, setQuestions] = useState([])
  const [gameStarted, setGameStarted] = useState(false)

  const handleNotesSubmitted = (notes) => {
    console.log("Notes Submitted:", notes)
    setStudyNotes(notes)
    const parsedQuestions = parseNotes(notes)
    console.log("Parsed Questions:", parsedQuestions)
    if (parsedQuestions.length === 0) {
      alert("Could not find any questions in the notes. Please provide text with sentences ending in '.', '?', or '!'.")
      return // Don't start the game if no questions found
    }
    setQuestions(parsedQuestions)
    setGameStarted(true)
  }

  return (
    <div className="App">
      <h1>Questify MVP</h1>
      <ErrorBoundary>
        {!gameStarted ? (
          <Upload onNotesSubmitted={handleNotesSubmitted} />
        ) : (
          <Game questions={questions} />
          // Placeholder for Game component - will be replaced by Phaser game canvas
          // For now, just show that the game should start and the questions
          // <div>
          //   <h2>Game Starting!</h2>
          //   <p>Questions Parsed: {questions.length}</p>
          //   <ol>
          //     {questions.map((q, index) => <li key={index}>{q}</li>)}
          //   </ol>
          // </div>
        )}
      </ErrorBoundary>
    </div>
  )
}

export default App
