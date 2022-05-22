import Button from './components/Button';

function App() {
  return (
    <div>
      <h1>Omnia</h1>
      <Button btnName="Sender" endpoint="sender"/>
      <br />
      <br />
      <Button btnName="Receiver" endpoint="sender"/>
    </div>
  );
}

export default App;
