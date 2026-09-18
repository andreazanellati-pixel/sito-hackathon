// Legge il testo da contenuti/home.txt e lo mostra nella pagina.
// Cosi' i contenuti restano separati dal codice.

fetch("contenuti/home.txt")
  .then(function (risposta) {
    return risposta.text();
  })
  .then(function (testo) {
    // Tolgo le righe di nota (#) e le righe vuote.
    var righe = testo
      .split("\n")
      .map(function (riga) { return riga.trim(); })
      .filter(function (riga) { return riga !== "" && riga.charAt(0) !== "#"; });

    var titolo = righe.shift() || "Sito";
    var sottotitolo = righe.shift() || "";

    document.title = titolo;
    document.getElementById("titolo").textContent = titolo;
    document.getElementById("sottotitolo").textContent = sottotitolo;

    var contenuto = document.getElementById("contenuto");
    contenuto.innerHTML = "";
    righe.forEach(function (riga) {
      var p = document.createElement("p");
      p.textContent = riga;
      contenuto.appendChild(p);
    });
  })
  .catch(function () {
    document.getElementById("contenuto").textContent =
      "Non riesco a leggere contenuti/home.txt (succede se apri il file " +
      "direttamente dal computer invece che dal sito pubblicato).";
  });
