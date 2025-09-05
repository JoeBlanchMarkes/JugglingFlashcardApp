export default function Manage() {
  return (
    <div className="manage">
      <h2>Manage Moves</h2>
      <p>This is where you can add, edit, and delete juggling moves.</p>
      <div className="move-list">
        <h3>Your Moves</h3>
        <p>No moves added yet.</p>
        <button>Add New Move</button>
      </div>
    </div>
  )
}