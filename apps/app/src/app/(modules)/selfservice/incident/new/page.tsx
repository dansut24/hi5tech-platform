import { createIncident } from "./actions";

<form action={createIncident} className="space-y-4">
  <input
    name="title"
    required
    className="hi5-input"
    placeholder="e.g. Can’t access email"
  />

  <textarea
    name="description"
    required
    className="hi5-input"
    placeholder="Describe the issue..."
  />

  <select name="priority" className="hi5-input">
    <option value="low">Low</option>
    <option value="medium" defaultValue>
      Medium
    </option>
    <option value="high">High</option>
    <option value="critical">Critical</option>
  </select>

  <button type="submit" className="hi5-btn-primary w-full">
    Submit
  </button>
</form>
