import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainScreen from './screens/MainScreen';
import EmailVerificationPage from './components/EmailVerificationPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<MainScreen />} />
          <Route path="/auth/verify" element={<EmailVerificationPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
