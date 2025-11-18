function startPlanner() {
  const widthInput = document.getElementById("room-width");
  const lengthInput = document.getElementById("room-length");

  const width = parseFloat(widthInput.value);
  const length = parseFloat(lengthInput.value);

  // Validation
  if (!width || !length) {
    alert("Please enter both width and length dimensions");
    return;
  }

  if (width < 1 || width > 20 || length < 1 || length > 20) {
    alert("Please enter dimensions between 1M and 20M");
    return;
  }

  // Store dimensions in localStorage for the planner page
  localStorage.setItem("roomWidth", width);
  localStorage.setItem("roomLength", length);

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
});

