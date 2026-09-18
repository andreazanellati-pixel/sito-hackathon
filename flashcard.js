/* ================================================================
   Gioco di flashcard.
   Legge le carte da contenuti/carte.txt e gestisce il ripasso.
   Nessuna libreria esterna: solo JavaScript scritto a mano.
   ================================================================ */

/* --- memoria del gioco ------------------------------------------------ */

var tutteLeCarte = [];   // le carte lette dal file
var righeSaltate = [];   // le righe scritte male, con il loro numero
var coda = [];           // le carte ancora da indovinare in questa partita
var cartaCorrente = null;
var cartaGirata = false;
var carteDellaPartita = 0;
var indovinateAlPrimoColpo = 0;
var daRipassare = [];    // carte sbagliate almeno una volta

/* Ogni quante carte ricompare una carta sbagliata.
   Numero piccolo = torna prima e piu' spesso. */
var DISTANZA_RIPETIZIONE = 3;

/* --- scorciatoia per prendere un elemento della pagina ---------------- */

function el(id) { return document.getElementById(id); }

/* ================================================================
   1. LETTURA DEL FILE DELLE CARTE
   ================================================================ */

function leggiCarte(testo) {
  var righe = testo.split("\n");

  for (var i = 0; i < righe.length; i++) {
    var numeroRiga = i + 1;              // le righe si contano da 1
    var riga = righe[i].trim();

    // Righe vuote e note: si saltano senza segnalare niente.
    if (riga === "" || riga.charAt(0) === "#") { continue; }

    var parti = riga.split("|");

    // Deve avere esattamente tre parti.
    if (parti.length !== 3) {
      righeSaltate.push({
        numero: numeroRiga,
        motivo: parti.length < 3
          ? "mancano delle parti (servono domanda | risposta | categoria)"
          : "ci sono troppe barre |",
        testo: riga
      });
      continue;
    }

    var domanda = parti[0].trim();
    var risposta = parti[1].trim();
    var categoria = parti[2].trim();

    // Nessuna delle tre parti puo' essere vuota.
    if (domanda === "" || risposta === "" || categoria === "") {
      righeSaltate.push({
        numero: numeroRiga,
        motivo: "una delle tre parti e' vuota",
        testo: riga
      });
      continue;
    }

    tutteLeCarte.push({
      domanda: domanda,
      risposta: risposta,
      categoria: categoria
    });
  }
}

function mostraRigheSaltate() {
  if (righeSaltate.length === 0) { return; }

  var elenco = el("elenco-righe-saltate");
  righeSaltate.forEach(function (problema) {
    var voce = document.createElement("li");
    voce.textContent = "Riga " + problema.numero + ": " + problema.motivo +
      " — «" + accorcia(problema.testo, 60) + "»";
    elenco.appendChild(voce);
  });

  el("avviso-righe").classList.remove("nascosto");
}

function accorcia(testo, lunghezza) {
  return testo.length > lunghezza ? testo.slice(0, lunghezza) + "…" : testo;
}

/* ================================================================
   2. SCHERMATA DI AVVIO: il filtro per categoria
   ================================================================ */

function preparaAvvio() {
  var menu = el("filtro-categoria");

  // Elenco delle categorie senza doppioni, in ordine alfabetico.
  var categorie = [];
  tutteLeCarte.forEach(function (carta) {
    if (categorie.indexOf(carta.categoria) === -1) {
      categorie.push(carta.categoria);
    }
  });
  categorie.sort(function (a, b) { return a.localeCompare(b, "it"); });

  aggiungiVoce(menu, "TUTTE", "Tutte le categorie (" + tutteLeCarte.length + " carte)");
  categorie.forEach(function (categoria) {
    var quante = carteDellaCategoria(categoria).length;
    aggiungiVoce(menu, categoria, categoria + " (" + quante + ")");
  });

  menu.addEventListener("change", aggiornaConteggio);
  aggiornaConteggio();

  el("stato-caricamento").classList.add("nascosto");
  el("blocco-avvio").classList.remove("nascosto");
}

function aggiungiVoce(menu, valore, etichetta) {
  var voce = document.createElement("option");
  voce.value = valore;
  voce.textContent = etichetta;
  menu.appendChild(voce);
}

function carteDellaCategoria(categoria) {
  if (categoria === "TUTTE") { return tutteLeCarte.slice(); }
  return tutteLeCarte.filter(function (carta) {
    return carta.categoria === categoria;
  });
}

function aggiornaConteggio() {
  var scelta = el("filtro-categoria").value;
  el("numero-carte").textContent = carteDellaCategoria(scelta).length;
}

/* ================================================================
   3. LA PARTITA
   ================================================================ */

function iniziaPartita(carte) {
  if (carte.length === 0) { return; }

  coda = mescola(carte).map(function (carta) {
    return { carta: carta, sbagliataPrima: false };
  });

  carteDellaPartita = coda.length;
  indovinateAlPrimoColpo = 0;
  daRipassare = [];

  mostraSchermata("schermata-gioco");
  prossimaCarta();
}

/* Mescola le carte (metodo di Fisher-Yates). */
function mescola(elenco) {
  var copia = elenco.slice();
  for (var i = copia.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temporaneo = copia[i];
    copia[i] = copia[j];
    copia[j] = temporaneo;
  }
  return copia;
}

function prossimaCarta() {
  if (coda.length === 0) { finePartita(); return; }

  cartaCorrente = coda[0];
  cartaGirata = false;

  el("categoria-carta").textContent = cartaCorrente.carta.categoria;
  el("testo-domanda").textContent = cartaCorrente.carta.domanda;
  el("testo-risposta").textContent = cartaCorrente.carta.risposta;

  el("carta").classList.remove("girata");
  el("carta").setAttribute("aria-label",
    "Domanda: " + cartaCorrente.carta.domanda + ". Premi per vedere la risposta.");
  el("bottoni-risposta").classList.add("invisibile");

  aggiornaAvanzamento();
}

function giraCarta() {
  if (cartaGirata || cartaCorrente === null) { return; }
  cartaGirata = true;
  el("carta").classList.add("girata");
  el("bottoni-risposta").classList.remove("invisibile");
}

function rispondi(laSapevo) {
  if (!cartaGirata || cartaCorrente === null) { return; }

  var voce = coda.shift();   // toglie la carta dalla cima della coda

  if (laSapevo) {
    if (!voce.sbagliataPrima) { indovinateAlPrimoColpo++; }
    // indovinata: esce dal mazzo e non torna piu'
  } else {
    if (!voce.sbagliataPrima) {
      voce.sbagliataPrima = true;
      daRipassare.push(voce.carta);
    }
    // Rimessa poco piu' avanti nella coda: cosi' torna presto e spesso.
    var posizione = Math.min(DISTANZA_RIPETIZIONE, coda.length);
    coda.splice(posizione, 0, voce);
  }

  cartaCorrente = null;
  prossimaCarta();
}

function aggiornaAvanzamento() {
  var rimaste = coda.length;
  var sapute = carteDellaPartita - rimaste;
  var percentuale = carteDellaPartita === 0
    ? 0
    : Math.round((sapute / carteDellaPartita) * 100);

  el("barra-piena").style.width = percentuale + "%";
  el("carte-rimaste").textContent = rimaste;
  el("carte-fatte").textContent = sapute;
}

/* ================================================================
   4. RISULTATO FINALE
   ================================================================ */

function finePartita() {
  var percentuale = carteDellaPartita === 0
    ? 0
    : Math.round((indovinateAlPrimoColpo / carteDellaPartita) * 100);

  el("punteggio-numero").textContent = percentuale;
  el("punteggio-frase").textContent = fraseDiCommento(percentuale);
  el("dettaglio-primo").textContent = indovinateAlPrimoColpo;
  el("dettaglio-totale").textContent = carteDellaPartita;

  var elenco = el("elenco-ripassare");
  elenco.innerHTML = "";

  if (daRipassare.length > 0) {
    daRipassare.forEach(function (carta) {
      var voce = document.createElement("li");
      voce.textContent = carta.domanda;
      elenco.appendChild(voce);
    });
    el("blocco-ripassare").classList.remove("nascosto");
    el("bottone-ripeti-sbagliate").classList.remove("nascosto");
  } else {
    el("blocco-ripassare").classList.add("nascosto");
    el("bottone-ripeti-sbagliate").classList.add("nascosto");
  }

  mostraSchermata("schermata-fine");
}

function fraseDiCommento(percentuale) {
  if (percentuale === 100) { return "Perfetto: tutte giuste al primo colpo."; }
  if (percentuale >= 80) { return "Molto bene, manca poco."; }
  if (percentuale >= 60) { return "Buon lavoro: ripassa le carte qui sotto."; }
  if (percentuale >= 40) { return "Sei a meta' strada: vale la pena rifare il giro."; }
  return "Argomento ancora da studiare: riprova fra un po'.";
}

/* ================================================================
   5. CAMBIO DI SCHERMATA
   ================================================================ */

function mostraSchermata(quale) {
  ["schermata-avvio", "schermata-gioco", "schermata-fine"].forEach(function (nome) {
    el(nome).classList.toggle("nascosto", nome !== quale);
  });
  window.scrollTo(0, 0);
}

/* ================================================================
   6. COLLEGAMENTO DEI COMANDI
   ================================================================ */

function collegaComandi() {
  el("bottone-inizia").addEventListener("click", function () {
    iniziaPartita(carteDellaCategoria(el("filtro-categoria").value));
  });

  el("carta").addEventListener("click", giraCarta);

  el("carta").addEventListener("keydown", function (evento) {
    if (evento.key === " " || evento.key === "Enter") {
      evento.preventDefault();
      giraCarta();
    }
  });

  el("bottone-giusta").addEventListener("click", function () { rispondi(true); });
  el("bottone-sbagliata").addEventListener("click", function () { rispondi(false); });

  el("bottone-abbandona").addEventListener("click", function () {
    mostraSchermata("schermata-avvio");
  });

  el("bottone-ricomincia").addEventListener("click", function () {
    mostraSchermata("schermata-avvio");
  });

  el("bottone-ripeti-sbagliate").addEventListener("click", function () {
    iniziaPartita(daRipassare.slice());
  });

  // Scorciatoie da tastiera, utili al computer.
  document.addEventListener("keydown", function (evento) {
    if (el("schermata-gioco").classList.contains("nascosto")) { return; }

    if (evento.key === " ") { evento.preventDefault(); giraCarta(); }
    if (evento.key === "ArrowRight") { rispondi(true); }
    if (evento.key === "ArrowLeft") { rispondi(false); }
  });
}

/* ================================================================
   7. AVVIO
   ================================================================ */

fetch("contenuti/carte.txt")
  .then(function (risposta) {
    if (!risposta.ok) { throw new Error("file non trovato"); }
    return risposta.text();
  })
  .then(function (testo) {
    leggiCarte(testo);
    mostraRigheSaltate();

    if (tutteLeCarte.length === 0) {
      el("stato-caricamento").textContent =
        "Nessuna carta valida in contenuti/carte.txt: controlla il formato " +
        "domanda | risposta | categoria.";
      return;
    }

    preparaAvvio();
    collegaComandi();
  })
  .catch(function () {
    el("stato-caricamento").textContent =
      "Non riesco a leggere contenuti/carte.txt. Succede se apri il file " +
      "direttamente dal computer invece che dal sito pubblicato o da un server locale.";
  });
