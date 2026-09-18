// Legge il testo da contenuti/home.txt e lo mostra nella pagina.
// Cosi' i contenuti restano separati dal codice.
//
// Regola: le righe vuote separano i blocchi.
// Primo blocco = titolo, secondo = sottotitolo, gli altri = paragrafi.

fetch("contenuti/home.txt")
  .then(function (risposta) {
    return risposta.text();
  })
  .then(function (testo) {
    var blocchi = testo
      .split("\n")
      // Tolgo le righe di nota, che iniziano con il cancelletto.
      .filter(function (riga) { return riga.trim().charAt(0) !== "#"; })
      .join("\n")
      // Una o piu' righe vuote separano un blocco dall'altro.
      .split(/\n\s*\n/)
      // Dentro un blocco gli "a capo" diventano spazi: il testo resta unito.
      .map(function (blocco) { return blocco.replace(/\s+/g, " ").trim(); })
      .filter(function (blocco) { return blocco !== ""; });

    var titolo = blocchi.shift() || "Sito";
    var sottotitolo = blocchi.shift() || "";

    document.title = titolo;
    document.getElementById("titolo").textContent = titolo;
    document.getElementById("sottotitolo").textContent = sottotitolo;

    var contenuto = document.getElementById("contenuto");
    contenuto.innerHTML = "";
    blocchi.forEach(function (blocco) {
      var p = document.createElement("p");
      p.textContent = blocco;
      contenuto.appendChild(p);
    });
  })
  .catch(function () {
    document.getElementById("contenuto").textContent =
      "Non riesco a leggere contenuti/home.txt (succede se apri il file " +
      "direttamente dal computer invece che dal sito pubblicato).";
  });
