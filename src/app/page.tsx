"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Music,
  List,
  Clock,
  User,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LoginModal from "@/components/LoginModal";
import { Session } from "@supabase/supabase-js";

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  status: string;
  added_by: string;
  created_at?: string;
}

interface Setlist {
  id: string;
  name: string;
  songs: string[];
  created_at?: string;
}

const BandManager = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeTab, setActiveTab] = useState("songs");
  const [showSongForm, setShowSongForm] = useState(false);
  const [showSetlistForm, setShowSetlistForm] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [sortBy, setSortBy] = useState<"title" | "artist" | "status">("title");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "da_provare" | "in_prova" | "pronta"
  >("all");

  // Stati del form canzone
  const [songForm, setSongForm] = useState<Omit<Song, "id">>({
    title: "",
    artist: "",
    duration: "",
    status: "da_provare",
    added_by: session?.user?.email?.split("@")[0] || "Unknown",
  });

  // Stati del form setlist
  const [setlistForm, setSetlistForm] = useState<{
    name: string;
    selectedSongs: string[];
  }>({
    name: "",
    selectedSongs: [],
  });

  // Check for active session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setShowLoginModal(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setShowLoginModal(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial data only when logged in
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch data if we have a session
      if (!session) {
        setSongs([]);
        setSetlists([]);
        return;
      }

      setLoading(true);
      try {
        // Fetch songs
        const { data: songsData, error: songsError } = await supabase
          .from("songs")
          .select("*")
          .order("created_at", { ascending: true });

        if (songsError) throw songsError;
        setSongs(songsData || []);

        // Fetch setlists
        const { data: setlistsData, error: setlistsError } = await supabase
          .from("setlists")
          .select("*")
          .order("created_at", { ascending: true });

        if (setlistsError) throw setlistsError;
        setSetlists(setlistsData || []);
      } catch (error) {
        console.error("Error loading data:", error);
        alert("Error loading data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]); // Re-fetch when session changes

  const resetSongForm = () => {
    setSongForm({
      title: "",
      artist: "",
      duration: "",
      status: "da_provare",
      added_by: session?.user?.email?.split("@")[0] || "Unknown",
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

  const handleSaveSong = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);

    if (!songForm.title.trim() || !songForm.artist.trim()) {
      alert("Titolo e artista sono obbligatori!");
      return;
    }

    try {
      // Make sure added_by is always the current user's username
      const currentUsername = session?.user?.email?.split("@")[0] || "Unknown";

      if (editingSong) {
        // Update song in songs table
        const { error: songError } = await supabase
          .from("songs")
          .update({ ...songForm, added_by: currentUsername })
          .eq("id", editingSong.id);

        if (songError) throw songError;

        setSongs(
          songs.map((song) =>
            song.id === editingSong.id
              ? { ...songForm, id: editingSong.id }
              : song
          )
        );
      } else {
        // Insert new song
        const { data, error: songError } = await supabase
          .from("songs")
          .insert([{ ...songForm, added_by: currentUsername }])
          .select()
          .single();

        if (songError) throw songError;

        if (data) {
          setSongs([...songs, data]);
        }
      }

      resetSongForm();
    } catch (error) {
      console.error("Error saving song:", error);
      alert("Error saving song. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSong = (song: Song): void => {
    setSongForm(song);
    setEditingSong(song);
    setShowSongForm(true);
  };

  interface SetlistWithSongs extends Setlist {
    songs: string[];
  }

  const handleDeleteSong = async (songId: string): Promise<void> => {
    if (window.confirm("Sei sicuro di voler eliminare questa canzone?")) {
      setLoading(true);
      try {
        // Delete the song
        const { error: deleteError } = await supabase
          .from("songs")
          .delete()
          .eq("id", songId);

        if (deleteError) throw deleteError;

        // Update local state for songs
        setSongs(songs.filter((song) => song.id !== songId));

        // Update setlists to remove the deleted song
        const updatedSetlists = setlists.map((setlist) => ({
          ...setlist,
          songs: setlist.songs.filter((id) => id !== songId),
        }));

        // Update setlists in Supabase
        for (const setlist of updatedSetlists) {
          if (
            setlist.songs !== setlists.find((s) => s.id === setlist.id)?.songs
          ) {
            const { error: updateError } = await supabase
              .from("setlists")
              .update({ songs: setlist.songs })
              .eq("id", setlist.id);

            if (updateError) throw updateError;
          }
        }

        setSetlists(updatedSetlists);
      } catch (error) {
        console.error("Error deleting song:", error);
        alert("Error deleting song. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  interface SaveSetlistResult {
    name: string;
    id: string;
    songs: string[];
  }

  const handleSaveSetlist = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    if (!setlistForm.name.trim()) {
      alert("Il nome della setlist è obbligatorio!");
      return;
    }

    if (setlistForm.selectedSongs.length === 0) {
      alert("Seleziona almeno una canzone per la setlist!");
      return;
    }

    try {
      if (editingSetlist) {
        const { error } = await supabase
          .from("setlists")
          .update({
            name: setlistForm.name,
            songs: setlistForm.selectedSongs,
          })
          .eq("id", editingSetlist.id);

        if (error) throw error;

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
        const { data, error } = await supabase
          .from("setlists")
          .insert([
            {
              name: setlistForm.name,
              songs: setlistForm.selectedSongs,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSetlists([...setlists, data]);
        }
      }

      resetSetlistForm();
    } catch (error) {
      console.error("Error saving setlist:", error);
      alert("Error saving setlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  interface EditSetlistParams extends Setlist {
    name: string;
    songs: string[];
  }

  const handleEditSetlist = (setlist: EditSetlistParams): void => {
    setSetlistForm({
      name: setlist.name,
      selectedSongs: setlist.songs || [],
    });
    setEditingSetlist(setlist);
    setShowSetlistForm(true);
  };

  interface DeleteSetlistParams {
    setlistId: string;
  }

  const handleDeleteSetlist = async ({
    setlistId,
  }: DeleteSetlistParams): Promise<void> => {
    if (window.confirm("Sei sicuro di voler eliminare questa setlist?")) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("setlists")
          .delete()
          .eq("id", setlistId);

        if (error) throw error;
        setSetlists(setlists.filter((setlist) => setlist.id !== setlistId));
      } catch (error) {
        console.error("Error deleting setlist:", error);
        alert("Error deleting setlist. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: Song["status"]) => {
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

  const getStatusText = (status: Song["status"]) => {
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

  const calculateSetlistDuration = (songIds: string[]): string => {
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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error logging out:", error);
      alert("Error logging out");
    }
  };

  const toggleSongInSetlist = (songId: string): void => {
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
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">🎵 Vox Jam</h1>
            <p className="text-gray-300">Gestisci le tue canzoni e setlist</p>
          </div>
          {session && (
            <button
              onClick={handleLogout}
              className="bg-gray-800 text-gray-300 hover:text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2 border border-gray-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
        {/* Not logged in message */}
        {!session && !showLoginModal && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">
              Benvenuto in Vox Jam
            </h2>
            <p className="text-gray-300 mb-6">
              Effettua il login per gestire le tue canzoni e setlist
            </p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors shadow-lg"
            >
              Login
            </button>
          </div>
        )}
        {/* Loading Indicator */}
        {loading && session && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <p className="text-white">Caricamento...</p>
            </div>
          </div>
        )}
        {/* Main App Content - Only shown when logged in */}
        {session && (
          <>
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

            {/* Tab Content */}
            {activeTab === "songs" && <div>{/* Songs content... */}</div>}
            {activeTab === "setlists" && <div>{/* Setlists content... */}</div>}

            {/* Forms */}
            {showSongForm && <div>{/* Song form content... */}</div>}
            {showSetlistForm && <div>{/* Setlist form content... */}</div>}
          </>
        )}{" "}
        {/* Tab Canzoni */}
        {activeTab === "songs" && (
          <div>
            {/* Controlli */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as "title" | "artist" | "status")
                    }
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="title">Ordina per Titolo</option>
                    <option value="artist">Ordina per Artista</option>
                    <option value="status">Ordina per Stato</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(
                        e.target.value as
                          | "all"
                          | "da_provare"
                          | "in_prova"
                          | "pronta"
                      )
                    }
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
                              {song.added_by || "Anonimo"}
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
                          onClick={() =>
                            handleDeleteSetlist({ setlistId: setlist.id })
                          }
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
          <div className="fixed inset-0 bg-gradient-to-br from-gray-900/90 via-purple-900/90 to-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-gray-800/95 rounded-lg shadow-2xl max-w-md w-full border border-gray-600">
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
          <div className="fixed inset-0 bg-gradient-to-br from-gray-900/90 via-purple-900/90 to-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-gray-800/95 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-600">
              <form onSubmit={handleSaveSetlist} className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  {editingSetlist ? "Modifica Setlist" : "Nuova Setlist"}
                </h3>
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

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={resetSetlistForm}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors shadow-lg"
                  >
                    {editingSetlist ? "Aggiorna" : "Crea"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => session && setShowLoginModal(false)}
      />
    </div>
  );
};

export default BandManager;

/* created by khr0me */
