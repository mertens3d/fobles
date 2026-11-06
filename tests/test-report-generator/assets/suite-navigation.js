(() => {
  const navigation = document.querySelector("[data-suite-nav]");
  const reportFiles = globalThis.FOBLES_TEST_REPORTS;

  if (!navigation || !Array.isArray(reportFiles)) {
    return;
  }

  const currentFile = window.location.pathname.split("/").pop();
  const fragment = document.createDocumentFragment();

  for (const file of reportFiles) {
    const rawLabel = file.replace(/^test-report-?/, "").replace(/\.html$/, "") || "current";
    const [, project] = /^(stateful|parallel)(?:-|$)/.exec(rawLabel) ?? [];
    const suite = project ? rawLabel.slice(project.length).replace(/^-/, "") || "all" : rawLabel;
    const label = project ? `${project} / ${suite}` : suite;
    const item = document.createElement(file === currentFile ? "span" : "a");
    const classes = ["suite-nav__item"];

    if (project) {
      classes.push(`suite-nav__item--${project}`);
    }
    if (file === currentFile) {
      classes.push("current");
    } else {
      item.setAttribute("href", file);
    }

    item.className = classes.join(" ");
    item.textContent = label;
    fragment.appendChild(item);
  }

  navigation.replaceChildren(fragment);
})();
