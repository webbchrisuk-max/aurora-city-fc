
document.addEventListener("click", event => {
  const head = event.target.closest("[data-m18-toggle]");
  if (!head) return;
  const body = document.getElementById(head.dataset.m18Toggle);
  if (body) body.classList.toggle("closed");
});
