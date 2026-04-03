import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { useState, useEffect, useRef } from "react";

type Tab = "crossword" | "audio";

export default function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem("phoodle-auth") === "true");
  const [activeTab, setActiveTab] = useState<Tab>("crossword");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Phoodle Content Manager</h2>
        {authed && <SignOutButton onSignOut={() => setAuthed(false)} />}
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {authed ? (
            <>
              <div className="flex gap-1 mb-6 bg-white rounded-lg shadow-sm border p-1 w-fit">
                <button
                  onClick={() => setActiveTab("crossword")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "crossword"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Mini Crosswords
                </button>
                <button
                  onClick={() => setActiveTab("audio")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "audio"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Audio Files
                </button>
              </div>
              {activeTab === "crossword" ? <CrosswordEditor /> : <AudioManager />}
            </>
          ) : (
            <div className="text-center">
              <h1 className="text-4xl font-bold text-primary mb-4">Phoodle Content Manager</h1>
              <p className="text-xl text-secondary mb-8">Sign in to manage crosswords and audio files</p>
              <SignInForm onAuth={() => setAuthed(true)} />
            </div>
          )}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function AudioManager() {
  const audioFiles = useQuery(api.audioFiles.getAllAudioFiles);
  const generateUploadUrl = useMutation(api.audioFiles.generateUploadUrl);
  const saveFileMetadata = useMutation(api.audioFiles.saveFileMetadata);
  const deleteAudioFile = useMutation(api.audioFiles.deleteAudioFile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Step 1: Get an upload URL from Convex
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload the file to Convex storage
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { storageId } = await result.json();

        // Step 3: Save metadata
        await saveFileMetadata({
          storageId,
          fileName: file.name,
          contentType: file.type || "audio/mpeg",
          size: file.size,
        });

        toast.success(`Uploaded ${file.name}`);
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      await deleteAudioFile({ id: fileId as any });
      toast.success(`Deleted ${fileName}`);
    } catch (error) {
      toast.error("Failed to delete file");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = audioFiles?.filter((f) => {
    if (!searchTerm) return true;
    return f.fileName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Upload Audio Files</h3>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {uploading && (
            <span className="text-sm text-blue-600 whitespace-nowrap">Uploading...</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">Accepts MP3 and other audio formats</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* File List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Audio Files {audioFiles ? `(${audioFiles.length})` : ""}
              </h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search files..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredFiles?.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{file.fileName}</div>
                    <div className="text-xs text-gray-500">
                      {formatSize(file.size)} &middot; {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {file.url && (
                      <>
                        <audio controls preload="none" className="h-8" style={{ minWidth: "250px" }}>
                          <source src={file.url} type={file.contentType} />
                        </audio>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(file.url!);
                            toast.success("URL copied to clipboard");
                          }}
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 border border-blue-200 whitespace-nowrap"
                        >
                          Copy URL
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(file._id, file.fileName)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 border border-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredFiles?.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">No audio files found</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Audio API Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Audio API Endpoints</h3>
            <div className="space-y-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium mb-2">Authentication</h4>
                <p className="text-gray-600 mb-2">Same secret key as crossword API</p>
              </div>

              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                  GET /api/audio
                </code>
                <p className="text-gray-600">List all audio files</p>
              </div>

              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                  GET /api/audio?fileName=song.mp3
                </code>
                <p className="text-gray-600">Get audio file by name</p>
              </div>

              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                  GET /api/audio/serve?fileName=song.mp3
                </code>
                <p className="text-gray-600">Stream/serve audio (no auth needed)</p>
              </div>

              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                  POST /api/audio/upload-url
                </code>
                <p className="text-gray-600 mb-2">Get upload URL</p>
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-600">Upload flow</summary>
                  <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-600">
                    <li>POST /api/audio/upload-url to get uploadUrl</li>
                    <li>POST file body to uploadUrl (Content-Type header)</li>
                    <li>POST /api/audio with storageId, fileName, contentType, size</li>
                  </ol>
                </details>
              </div>

              <div>
                <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                  DELETE /api/audio?fileName=song.mp3
                </code>
                <p className="text-gray-600">Delete audio file</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compute cell numbers from grid layout using standard crossword numbering rules.
// A cell gets a number if it starts an across word or a down word.
function computeCellNumbers(grid: string[][]) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const isBlack = (r: number, c: number) =>
    r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === "";

  const numbered: { row: number; col: number; number: number; across: boolean; down: boolean }[] = [];
  let num = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isBlack(r, c)) continue;

      const startsAcross = isBlack(r, c - 1) && !isBlack(r, c + 1);
      const startsDown = isBlack(r - 1, c) && !isBlack(r + 1, c);

      if (startsAcross || startsDown) {
        numbered.push({ row: r, col: c, number: num, across: startsAcross, down: startsDown });
        num++;
      }
    }
  }

  return numbered;
}

function buildCellNumberGrid(grid: string[][]) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const result: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0));
  for (const cell of computeCellNumbers(grid)) {
    result[cell.row][cell.col] = cell.number;
  }
  return result;
}

function CrosswordEditor() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [grid, setGrid] = useState<string[][]>(() =>
    Array(5).fill(null).map(() => Array(5).fill(' '))
  );

  const [acrossClues, setAcrossClues] = useState<Record<string, string>>({});
  const [downClues, setDownClues] = useState<Record<string, string>>({});

  const existingMini = useQuery(api.minis.getMiniByDate, { date: selectedDate });
  const allMinis = useQuery(api.minis.getAllMinis);
  const createOrUpdateMini = useMutation(api.minis.createOrUpdateMini);
  const deleteMini = useMutation(api.minis.deleteMini);

  // Compute numbered cells from current grid
  const numberedCells = computeCellNumbers(grid);
  const cellNumberGrid = buildCellNumberGrid(grid);
  const acrossNumbers = numberedCells.filter(c => c.across).map(c => c.number);
  const downNumbers = numberedCells.filter(c => c.down).map(c => c.number);

  // Load existing mini data when it changes
  useEffect(() => {
    if (existingMini) {
      setGrid(existingMini.grid);
      setAcrossClues(existingMini.acrossClues || {});
      setDownClues(existingMini.downClues || {});
    } else {
      // Reset to empty when no mini exists for this date
      setGrid(Array(5).fill(null).map(() => Array(5).fill(' ')));
      setAcrossClues({});
      setDownClues({});
    }
  }, [existingMini]);

  const updateCell = (row: number, col: number, value: string) => {
    const newGrid = grid.map(r => [...r]);
    // If the user clears the input (backspace), keep it as a space (white cell), not "" (black)
    newGrid[row][col] = value === "" ? " " : value.toUpperCase().slice(0, 1);
    setGrid(newGrid);
  };

  const toggleBlack = (row: number, col: number) => {
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = newGrid[row][col] === "" ? "" : "";
    // If already black (empty), we can't distinguish — so we use a special toggle approach:
    // Right-click toggles between black and empty-letter
    if (grid[row][col] === "") {
      // It's black, make it a blank letter cell (space placeholder)
      newGrid[row][col] = " ";
    } else {
      // Make it black
      newGrid[row][col] = "";
    }
    setGrid(newGrid);
  };

  const updateAcrossClue = (number: string, value: string) => {
    setAcrossClues(prev => ({ ...prev, [number]: value }));
  };

  const updateDownClue = (number: string, value: string) => {
    setDownClues(prev => ({ ...prev, [number]: value }));
  };

  const handleSave = async () => {
    // Clean grid: trim spaces back to empty for storage (black squares)
    const cleanGrid = grid.map(row => row.map(cell => cell.trim() === "" && cell === " " ? "" : cell.trim()));
    // Only include clues for numbers that actually exist
    const cleanAcross: Record<string, string> = {};
    for (const num of acrossNumbers) {
      if (acrossClues[String(num)]) cleanAcross[String(num)] = acrossClues[String(num)];
    }
    const cleanDown: Record<string, string> = {};
    for (const num of downNumbers) {
      if (downClues[String(num)]) cleanDown[String(num)] = downClues[String(num)];
    }

    try {
      await createOrUpdateMini({
        date: selectedDate,
        grid: cleanGrid,
        acrossClues: cleanAcross,
        downClues: cleanDown,
      });
      toast.success("Mini crossword saved successfully!");
    } catch (error) {
      toast.error("Failed to save mini crossword");
    }
  };

  const handleDelete = async () => {
    if (!existingMini) return;

    if (confirm("Are you sure you want to delete this mini crossword?")) {
      try {
        await deleteMini({ id: existingMini._id });
        toast.success("Mini crossword deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete mini crossword");
      }
    }
  };

  const loadMini = (mini: any) => {
    setSelectedDate(mini.date);
    setGrid(mini.grid);
    setAcrossClues(mini.acrossClues || {});
    setDownClues(mini.downClues || {});
  };

  const [searchDate, setSearchDate] = useState("");

  const filteredMinis = allMinis?.filter((mini) => {
    if (!searchDate) return true;
    return mini.date.includes(searchDate);
  });

  return (
    <div className="space-y-8">
      {/* Existing Minis */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Existing Minis</h3>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate("")}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 border border-gray-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {filteredMinis?.map((mini) => (
            <div
              key={mini._id}
              className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${
                mini.date === selectedDate ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => loadMini(mini)}
            >
              <div className="font-medium">{mini.date}</div>
            </div>
          ))}
          {filteredMinis?.length === 0 && (
            <p className="text-gray-500 text-sm">No minis found</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Editor */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">5x5 Grid</h3>
            <p className="text-xs text-gray-500 mb-4">Right-click a cell to toggle it as a black square. Numbers are computed automatically.</p>
            <div className="grid grid-cols-5 gap-0 w-fit mx-auto border-2 border-gray-800">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isBlack = cell === "";
                  const cellNum = cellNumberGrid[rowIndex][colIndex];
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`relative w-14 h-14 border border-gray-400 ${isBlack ? "bg-gray-900" : "bg-white"}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        toggleBlack(rowIndex, colIndex);
                      }}
                    >
                      {cellNum > 0 && (
                        <span className="absolute top-0 left-0.5 text-[10px] leading-none text-gray-500 font-medium">
                          {cellNum}
                        </span>
                      )}
                      {!isBlack && (
                        <input
                          type="text"
                          value={cell.trim()}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          className="w-full h-full text-center bg-transparent font-bold text-lg uppercase focus:outline-none focus:bg-blue-50 pt-2"
                          maxLength={1}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Across Clues */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Across</h3>
              {acrossNumbers.length === 0 && (
                <p className="text-sm text-gray-400">Fill in the grid to see across clues</p>
              )}
              {acrossNumbers.map((num) => (
                <div key={`across-${num}`} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {num}. Across
                  </label>
                  <input
                    type="text"
                    value={acrossClues[String(num)] || ""}
                    onChange={(e) => updateAcrossClue(String(num), e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter clue..."
                  />
                </div>
              ))}
            </div>

            {/* Down Clues */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Down</h3>
              {downNumbers.length === 0 && (
                <p className="text-sm text-gray-400">Fill in the grid to see down clues</p>
              )}
              {downNumbers.map((num) => (
                <div key={`down-${num}`} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {num}. Down
                  </label>
                  <input
                    type="text"
                    value={downClues[String(num)] || ""}
                    onChange={(e) => updateDownClue(String(num), e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter clue..."
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save Mini
            </button>
            {existingMini && (
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete Mini
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - API Info */}
      <div className="lg:col-span-1">
        {/* API Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">API Endpoints</h3>
          <div className="space-y-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-gray-600 mb-2">Include secret key in one of these ways:</p>
              <ul className="text-xs space-y-1 text-gray-500">
                <li>• Header: <code>Authorization: Bearer Bi7eEfMpVimsvRZBB8gLGyfnjuueKpVodU</code></li>
                <li>• Header: <code>X-Secret-Key: Bi7eEfMpVimsvRZBB8gLGyfnjuueKpVodU</code></li>
                <li>• Query: <code>?secret=Bi7eEfMpVimsvRZBB8gLGyfnjuueKpVodU</code></li>
              </ul>
            </div>

            <div>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                GET /api/mini?date=YYYY-MM-DD
              </code>
              <p className="text-gray-600">Get mini by date</p>
            </div>

            <div>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                GET /api/minis
              </code>
              <p className="text-gray-600">Get all minis</p>
            </div>

            <div>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                POST /api/mini
              </code>
              <p className="text-gray-600 mb-2">Create/update mini</p>
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600">Show body format</summary>
                <pre className="bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
{`{
  "date": "2024-01-15",
  "grid": [
    ["","","J","A","M"],
    ["","K","A","L","E"],
    ["R","A","M","E","N"],
    ["E","V","E","S",""],
    ["D","A","S","",""]
  ],
  "acrossClues": {
    "1": "English muffin topper",
    "4": "Healthy smoothie ingredient",
    "5": "Soup with a tonkotsu variety"
  },
  "downClues": {
    "1": "Chef and namesake of an annual award",
    "2": "Hoppy brews"
  }
}`}
                </pre>
              </details>
            </div>

            <div>
              <code className="bg-gray-100 px-2 py-1 rounded text-xs block mb-1">
                DELETE /api/mini?date=YYYY-MM-DD
              </code>
              <p className="text-gray-600">Delete mini by date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
