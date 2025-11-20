function startPlanner() {
  const widthInput = document.getElementById("room-width");
  const lengthInput = document.getElementById("room-length");
  const heightInput = document.getElementById("room-height");

  const width = parseFloat(widthInput.value);
  const length = parseFloat(lengthInput.value);
  const height = parseFloat(heightInput.value);

  // Validation
  if (!width || !length || !height) {
    showDialog("Please enter width, length, and height dimensions", "Validation Error");
    return;
  }

  if (width < 1 || width > 20 || length < 1 || length > 20 || height < 1 || height > 20) {
    showDialog("Please enter dimensions between 1M and 20M", "Validation Error");
    return;
  }

  // Store dimensions in localStorage for the planner page
  localStorage.setItem("roomWidth", width);
  localStorage.setItem("roomLength", length);
  localStorage.setItem("roomHeight", height);

  // Redirect to planner page
  window.location.href = "planner.html";
}

// Allow Enter key to start planner
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    startPlanner();
  }
});

// Auto-focus first input
window.addEventListener("load", function () {
  document.getElementById("room-width").focus();
  
  // Add tab navigation between inputs
  const inputs = ["room-width", "room-length", "room-height"];
  inputs.forEach((id, index) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          startPlanner();
        } else if (e.key === "Tab" && !e.shiftKey) {
          // Allow default tab behavior
        }
      });
    }
  });
});

