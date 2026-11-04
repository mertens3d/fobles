
(function () {
  var backdrop = document.getElementById("screenshot-modal-backdrop");
  var modalImg = document.getElementById("screenshot-modal-img");
  var modalFrame = document.getElementById("screenshot-modal-frame");

  if (backdrop && modalImg && modalFrame) {
    function openModal(kind, src, alt) {
      if (kind === "frame") {
        modalFrame.src = src;
        modalFrame.classList.add("active");
      } else {
        modalImg.src = src;
        modalImg.alt = alt || "";
        modalImg.classList.add("active");
      }
      backdrop.classList.add("open");
    }

    function closeModal() {
      backdrop.classList.remove("open");
      modalImg.classList.remove("active");
      modalFrame.classList.remove("active");
      modalImg.removeAttribute("src");
      modalFrame.removeAttribute("src");
    }

    document.addEventListener("click", function (event) {
      var thumb = event.target.closest(".screenshot-thumb");
      var modalLink = event.target.closest("[data-modal-src]");

      if (thumb) {
        openModal("image", thumb.src, thumb.alt);
        return;
      }

      if (modalLink) {
        event.preventDefault();
        openModal("frame", modalLink.getAttribute("data-modal-src"));
        return;
      }

      if (event.target.closest(".screenshot-modal-content")) {
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
})();

(function () {

  function isEnabled() {
    var checkbox =
      document.getElementById("auto-refresh-enabled");

    return checkbox && checkbox.checked;
  }
const tickTimeout = 1000;
  const initialSecondsLeft = 5;
  var secondsLeft = initialSecondsLeft;
  var el = document.getElementById("refresh-countdown");

  function tick() {

    if (!isEnabled()) {
      if (el) {
        el.textContent = "auto refresh paused";
      }

      setTimeout(tick, tickTimeout);
      return;
    }

    if (el) {
      el.textContent =
        "refreshing in " + secondsLeft + "s";
    }

    if (secondsLeft <= 0) {
      location.reload();
      // window.scrollTo(0, document.body.scrollHeight);
      return;
    }

    secondsLeft -= 1;
    setTimeout(tick, tickTimeout);
  }

  document.addEventListener("change", function (event) {
    var target = event.target;

    if (
      target &&
      target.id === "auto-refresh-enabled" &&
      target.checked
    ) {
      secondsLeft = initialSecondsLeft;
    }
  });

  tick();

})();