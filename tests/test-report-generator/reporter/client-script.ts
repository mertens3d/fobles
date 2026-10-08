export const REPORT_CLIENT_SCRIPT = `
<script>
(function () {
  var backdrop = document.getElementById("screenshot-modal-backdrop");
  var modalImg = document.getElementById("screenshot-modal-img");

  if (backdrop && modalImg) {
    function openModal(src, alt) {
      modalImg.src = src;
      modalImg.alt = alt || "";
      backdrop.classList.add("open");
    }

    function closeModal() {
      backdrop.classList.remove("open");
      modalImg.src = "";
    }

    document.addEventListener("click", function (event) {
      var thumb = event.target.closest(".screenshot-thumb");

      if (thumb) {
        openModal(thumb.src, thumb.alt);
        return;
      }

      if (backdrop.contains(event.target)) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }
})()
  </script>;
`;
export const refreshScriptRunning = `
<script>
(function () {

  function isEnabled() {
    var checkbox =
      document.getElementById("auto-refresh-enabled");

    return !checkbox || checkbox.checked;
  }

  var secondsLeft = 2;
  var el = document.getElementById("refresh-countdown");

  function tick() {

    if (!isEnabled()) {
      if (el) {
        el.textContent = "auto refresh paused";
      }

      setTimeout(tick, 1000);
      return;
    }

    if (el) {
      el.textContent =
        "refreshing in " + secondsLeft + "s";
    }

    if (secondsLeft <= 0) {
      location.reload();
      return;
    }

    secondsLeft -= 1;
    setTimeout(tick, 1000);
  }

  document.addEventListener("change", function (event) {
    var target = event.target;

    if (
      target &&
      target.id === "auto-refresh-enabled" &&
      target.checked
    ) {
      secondsLeft = 2;
    }
  });

  tick();

})();
</script>`;