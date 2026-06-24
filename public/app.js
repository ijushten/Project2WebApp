const lessonForm = document.querySelector("#lessonForm");
const generateButton = document.querySelector("#generateButton");

if (lessonForm && generateButton) {
  lessonForm.addEventListener("submit", () => {
    generateButton.disabled = true;
    generateButton.textContent = "Generating lesson plan...";
  });
}

const deleteForms = document.querySelectorAll(".delete-form");

deleteForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    const confirmed = confirm("Are you sure you want to delete this lesson plan?");

    if (!confirmed) {
      event.preventDefault();
    }
  });
});
