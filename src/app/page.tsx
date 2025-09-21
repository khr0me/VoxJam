import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Music, List, Clock, User } from "lucide-react";

const BandManager = () => {
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [activeTab, setActiveTab] = useState("songs");
  const [showSongForm, setShowSongForm] = useState(false);
  const [showSetlistForm, setShowSetlistForm] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [editingSetlist, setEditingSetlist] = useState(null);
  const [sortBy, setSortBy] = useState("title");
  const [filterStatus, setFilterStatus] = useState("all");

  // Stati del form canzone
  const [songForm, setSongForm] = useState({
    title: "",
    artist: "",
    duration: "",
    status: "da_provare",
    addedBy: "",
  });

  // Stati del form setlist
  const [setlistForm, setSetlistForm] = useState({
    name: "",
    selectedSongs: [],
  });

  // Carica dati al mount
  useEffect(() => {
    try {
      const savedSongs = localStorage.getItem("bandManager_songs");
      const savedSetlists = localStorage.getItem("bandManager_setlists");

      if (savedSongs) {
        setSongs(JSON.parse(savedSongs));
      }
      if (savedSetlists) {
        setSetlists(JSON.parse(savedSetlists));
      }
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    }
  }, []);

  // Salva nel localStorage quando cambiano i dati
  useEffect(() => {
    try {
      localStorage.setItem("bandManager_songs", JSON.stringify(songs));
    } catch (error) {
      console.error("Errore salvataggio canzoni:", error);
    }
  }, [songs]);

  useEffect(() => {
    try {
      localStorage.setItem("bandManager_setlists", JSON.stringify(setlists));
    } catch (error) {
      console.error("Errore salvataggio setlists:", error);
    }
  }, [setlists]);

  const resetSongForm = () => {
    setSongForm({
      title: "",
      artist: "",
      duration: "",
      status: "da_provare",
      addedBy: "",
    });
    setEditingSong(null);
    setShowSongForm(false);
  };

  const resetSetlistForm = () => {
    setSetlistForm({
      name: "",
      selectedSongs: [],
    });
    setEditingSetlist(null);
    setShowSetlistForm(false);
  };

  const handleSaveSong = (e) => {
    e.preventDefault();

    if (!songForm.title.trim() || !songForm.artist.trim()) {
      alert("Titolo e artista sono obbligatori!");
      return;
    }

    if (editingSong) {
      setSongs(
        songs.map((song) =>
          song.id === editingSong.id
            ? { ...songForm, id: editingSong.id }
            : song
        )
      );
    } else {
      const newSong = {
        ...songForm,
        id: Date.now().toString(),
      };
      setSongs([...songs, newSong]);
    }

    resetSongForm();
  };

  const handleEditSong = (song) => {
    setSongForm(song);
    setEditingSong(song);
    setShowSongForm(true);
  };

  const handleDeleteSong = (songId) => {
    if (window.confirm("Sei sicuro di voler eliminare questa canzone?")) {
      setSongs(songs.filter((song) => song.id !== songId));
      // Rimuovi anche dalle setlist
      setSetlists(
        setlists.map((setlist) => ({
          ...setlist,
          songs: setlist.songs.filter((id) => id !== songId),
        }))
      );
    }
  };

  const handleSaveSetlist = (e) => {
    e.preventDefault();

    if (!setlistForm.name.trim()) {
      alert("Il nome della setlist è obbligatorio!");
      return;
    }

    if (setlistForm.selectedSongs.length === 0) {
      alert("Seleziona almeno una canzone per la setlist!");
      return;
    }

    if (editingSetlist) {
      setSetlists(
        setlists.map((setlist) =>
          setlist.id === editingSetlist.id
            ? {
                ...setlistForm,
                id: editingSetlist.id,
                songs: setlistForm.selectedSongs,
              }
            : setlist
        )
      );
    } else {
      const newSetlist = {
        name: setlistForm.name,
        id: Date.now().toString(),
        songs: setlistForm.selectedSongs,
      };
      setSetlists([...setlists, newSetlist]);
    }

    resetSetlistForm();
  };

  const handleEditSetlist = (setlist) => {
    setSetlistForm({
      name: setlist.name,
      selectedSongs: setlist.songs || [],
    });
    setEditingSetlist(setlist);
    setShowSetlistForm(true);
  };

  const handleDeleteSetlist = (setlistId) => {
    if (window.confirm("Sei sicuro di voler eliminare questa setlist?")) {
      setSetlists(setlists.filter((setlist) => setlist.id !== setlistId));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "da_provare":
        return "bg-red-900 text-red-300 border border-red-700";
      case "in_scaletta":
        return "bg-yellow-900 text-yellow-300 border border-yellow-700";
      case "pronto":
        return "bg-green-900 text-green-300 border border-green-700";
      default:
        return "bg-gray-700 text-gray-300 border border-gray-600";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "da_provare":
        return "Da provare";
      case "in_scaletta":
        return "In scaletta";
      case "pronto":
        return "Pronto";
      default:
        return status;
    }
  };

  const filteredAndSortedSongs = songs
    .filter((song) => filterStatus === "all" || song.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "artist") return a.artist.localeCompare(b.artist);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return 0;
    });

  const calculateSetlistDuration = (songIds) => {
    if (!Array.isArray(songIds) || songIds.length === 0) return "0:00";

    const totalMinutes = songIds.reduce((total, songId) => {
      const song = songs.find((s) => s.id === songId);
      if (song && song.duration) {
        const parts = song.duration.split(":");
        if (parts.length === 2) {
          const minutes = parseInt(parts[0]) || 0;
          const seconds = parseInt(parts[1]) || 0;
          return total + minutes + seconds / 60;
        }
      }
      return total;
    }, 0);

    const minutes = Math.floor(totalMinutes);
    const seconds = Math.round((totalMinutes - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const toggleSongInSetlist = (songId) => {
    if (setlistForm.selectedSongs.includes(songId)) {
      setSetlistForm({
        ...setlistForm,
        selectedSongs: setlistForm.selectedSongs.filter((id) => id !== songId),
      });
    } else {
      setSetlistForm({
        ...setlistForm,
        selectedSongs: [...setlistForm.selectedSongs, songId],
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🎵 Vox Jam</h1>
          <p className="text-gray-300">Gestisci le tue canzoni e setlist</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 shadow-lg border border-gray-700">
            <button
              onClick={() => setActiveTab("songs")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === "songs"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-gray-300 hover:text-purple-400 hover:bg-gray-700"
              }`}
            >
              <Music className="inline w-5 h-5 mr-2" />
              Canzoni
            </button>
            <button
              onClick={() => setActiveTab("setlists")}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                activeTab === "setlists"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-gray-300 hover:text-purple-400 hover:bg-gray-700"
              }`}
            >
              <List className="inline w-5 h-5 mr-2" />
              Setlist
            </button>
          </div>
        </div>

        {/* Tab Canzoni */}
        {activeTab === "songs" && (
          <div>
            {/* Controlli */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="title">Ordina per Titolo</option>
                    <option value="artist">Ordina per Artista</option>
                    <option value="status">Ordina per Stato</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="all">Tutti gli stati</option>
                    <option value="da_provare">Da provare</option>
                    <option value="in_scaletta">In scaletta</option>
                    <option value="pronto">Pronto</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowSongForm(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Canzone
                </button>
              </div>
            </div>

            {/* Lista Canzoni */}
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
              {filteredAndSortedSongs.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nessuna canzone trovata</p>
                  <p>Aggiungi la tua prima canzone per iniziare!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Titolo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Artista
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Durata
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Stato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Aggiunto da
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-600">
                      {filteredAndSortedSongs.map((song) => (
                        <tr
                          key={song.id}
                          className="hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                            {song.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            {song.artist}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            <div className="flex items-center text-purple-300">
                              <Clock className="w-4 h-4 mr-1" />
                              {song.duration || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                song.status
                              )}`}
                            >
                              {getStatusText(song.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                            <div className="flex items-center text-purple-300">
                              <User className="w-4 h-4 mr-1" />
                              {song.addedBy || "Anonimo"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditSong(song)}
                                className="text-purple-400 hover:text-purple-300 p-1 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSong(song.id)}
                                className="text-red-400 hover:text-red-300 p-1 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Setlist */}
        {activeTab === "setlists" && (
          <div>
            {/* Controlli Setlist */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Le tue Setlist</h2>
                <button
                  onClick={() => setShowSetlistForm(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Crea Setlist
                </button>
              </div>
            </div>

            {/* Lista Setlist */}
            <div className="grid gap-6">
              {setlists.length === 0 ? (
                <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center text-gray-400 border border-gray-700">
                  <List className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nessuna setlist creata</p>
                  <p>Crea la tua prima setlist per organizzare i concerti!</p>
                </div>
              ) : (
                setlists.map((setlist) => (
                  <div
                    key={setlist.id}
                    className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {setlist.name}
                        </h3>
                        <p className="text-gray-300">
                          {(setlist.songs || []).length} canzoni • Durata:{" "}
                          {calculateSetlistDuration(setlist.songs || [])}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditSetlist(setlist)}
                          className="text-purple-400 hover:text-purple-300 p-2 transition-colors"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSetlist(setlist.id)}
                          className="text-red-400 hover:text-red-300 p-2 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(setlist.songs || []).map((songId, index) => {
                        const song = songs.find((s) => s.id === songId);
                        return song ? (
                          <div
                            key={songId}
                            className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded border border-gray-600"
                          >
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-purple-300 w-6">
                                {index + 1}.
                              </span>
                              <span className="font-medium text-white">
                                {song.title}
                              </span>
                              <span className="text-gray-300 ml-2">
                                - {song.artist}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  song.status
                                )}`}
                              >
                                {getStatusText(song.status)}
                              </span>
                              {song.duration && (
                                <span className="flex items-center text-purple-300">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {song.duration}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal Form Canzone */}
        {showSongForm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-600">
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  {editingSong ? "Modifica Canzone" : "Nuova Canzone"}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Titolo *
                    </label>
                    <input
                      type="text"
                      required
                      value={songForm.title}
                      onChange={(e) =>
                        setSongForm({ ...songForm, title: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Nome della canzone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Artista *
                    </label>
                    <input
                      type="text"
                      required
                      value={songForm.artist}
                      onChange={(e) =>
                        setSongForm({ ...songForm, artist: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Nome dell'artista"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Durata
                    </label>
                    <input
                      type="text"
                      value={songForm.duration}
                      onChange={(e) =>
                        setSongForm({ ...songForm, duration: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="es. 3:45"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Stato
                    </label>
                    <select
                      value={songForm.status}
                      onChange={(e) =>
                        setSongForm({ ...songForm, status: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="da_provare">Da provare</option>
                      <option value="in_scaletta">In scaletta</option>
                      <option value="pronto">Pronto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Aggiunto da
                    </label>
                    <input
                      type="text"
                      value={songForm.addedBy}
                      onChange={(e) =>
                        setSongForm({ ...songForm, addedBy: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Il tuo nome"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetSongForm}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSong}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors shadow-lg"
                  >
                    {editingSong ? "Aggiorna" : "Aggiungi"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Form Setlist */}
        {showSetlistForm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-600">
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  {editingSetlist ? "Modifica Setlist" : "Nuova Setlist"}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Nome Setlist *
                    </label>
                    <input
                      type="text"
                      required
                      value={setlistForm.name}
                      onChange={(e) =>
                        setSetlistForm({ ...setlistForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="es. Concerto Centro Sociale"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Seleziona Canzoni
                    </label>
                    <div className="bg-gray-700 border border-gray-600 rounded-md max-h-64 overflow-y-auto">
                      {songs.length === 0 ? (
                        <p className="p-4 text-gray-400 text-center">
                          Aggiungi prima alcune canzoni
                        </p>
                      ) : (
                        songs.map((song) => (
                          <label
                            key={song.id}
                            className="flex items-center p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={setlistForm.selectedSongs.includes(
                                song.id
                              )}
                              onChange={() => toggleSongInSetlist(song.id)}
                              className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 bg-gray-600 border-gray-500 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium text-white">
                                    {song.title}
                                  </span>
                                  <span className="text-gray-300 ml-2">
                                    - {song.artist}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                      song.status
                                    )}`}
                                  >
                                    {getStatusText(song.status)}
                                  </span>
                                  {song.duration && (
                                    <span className="text-xs text-gray-400">
                                      {song.duration}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {setlistForm.selectedSongs.length > 0 && (
                    <div className="text-sm text-gray-300 bg-gray-700 p-3 rounded-md border border-gray-600">
                      Canzoni selezionate: {setlistForm.selectedSongs.length} •
                      Durata totale:{" "}
                      {calculateSetlistDuration(setlistForm.selectedSongs)}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetSetlistForm}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSetlist}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors shadow-lg"
                  >
                    {editingSetlist ? "Aggiorna" : "Crea"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BandManager;
