const lessonForm = document.querySelector("#lessonForm");
const generateButton = document.querySelector("#generateButton");

if (lessonForm && generateButton) {
  lessonForm.addEventListener("submit", () => {
    generateButton.disabled = true;
    generateButton.textContent = "Generating lesson plan...";
  });
}

