"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Mic2, Waves, Music } from "lucide-react";

export type StemCount = 2 | 4 | 6;
export type OutputFormat = "wav" | "mp3";

interface SettingsPanelProps {
  stemCount: StemCount;
  onStemCountChange: (count: StemCount) => void;
  outputFormat: OutputFormat;
  onOutputFormatChange: (format: OutputFormat) => void;
}

const STEM_OPTIONS: { value: StemCount; label: string; description: string; icon: typeof Mic2 }[] = [
  { value: 2, label: "2 Stems", description: "Vocals + Instrumental", icon: Mic2 },
  { value: 4, label: "4 Stems", description: "Vocals, Drums, Bass, Other", icon: Music },
  { value: 6, label: "6 Stems", description: "All instruments separated", icon: Waves },
];

export function SettingsPanel({ stemCount, onStemCountChange, outputFormat, onOutputFormatChange }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"settings" | "history">("settings");
  const [stemsOpen, setStemsOpen] = useState(false);
  const currentStem = STEM_OPTIONS.find((o) => o.value === stemCount)!;

  return (
    <aside className="flex h-full w-[350px] shrink-0 flex-col" style={{ borderLeft: "1px solid #E5E5E8" }}>
      {/* Tabs — left-aligned like ElevenLabs */}
      <div className="flex h-[52px] items-end gap-[4px] px-[20px]" style={{ borderBottom: "1px solid #E5E5E8" }}>
        {(["settings", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative pb-[14px] px-[4px] text-[14px] transition-colors ${
              activeTab === tab
                ? "font-semibold text-[#0F0F10]"
                : "text-[#BBBBC4] hover:text-[#6B6B73]"
            }`}
          >
            {tab === "settings" ? "Settings" : "History"}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: "#0F0F10" }} />
            )}
          </button>
        ))}
      </div>

      {activeTab === "settings" ? (
        <div className="flex-1 overflow-y-auto px-[20px] py-[20px] space-y-[24px]">
          {/* Stems */}
          <div className="space-y-[8px]">
            <label className="text-[14px] font-semibold text-[#0F0F10]">Stems</label>
            <div className="relative">
              <button
                onClick={() => setStemsOpen(!stemsOpen)}
                style={{ border: "1px solid #E5E5E8" }}
                className="flex w-full items-center gap-[12px] rounded-[12px] px-[14px] py-[12px] text-left transition-colors hover:bg-[#FAFAFA]"
              >
                <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full shrink-0" style={{ backgroundColor: "#F4F4F5" }}>
                  <currentStem.icon className="h-[16px] w-[16px] text-[#6B6B73]" strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#0F0F10]">{currentStem.label}</p>
                  <p className="text-[12px] text-[#949494]">{currentStem.description}</p>
                </div>
                <ChevronRight className="h-[16px] w-[16px] text-[#BBBBC4] shrink-0" strokeWidth={2} />
              </button>
              {stemsOpen && (
                <div className="absolute left-0 right-0 top-full mt-[4px] z-10 rounded-[12px] bg-white overflow-hidden"
                  style={{ border: "1px solid #E5E5E8", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                  {STEM_OPTIONS.map((opt) => (
                    <button key={opt.value}
                      onClick={() => { onStemCountChange(opt.value); setStemsOpen(false); }}
                      style={stemCount === opt.value ? { backgroundColor: "#F4F4F5" } : undefined}
                      className="flex w-full items-center gap-[12px] px-[14px] py-[12px] text-left transition-colors hover:bg-[#FAFAFA]">
                      <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full shrink-0" style={{ backgroundColor: "#F4F4F5" }}>
                        <opt.icon className="h-[16px] w-[16px] text-[#6B6B73]" strokeWidth={1.6} />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#0F0F10]">{opt.label}</p>
                        <p className="text-[12px] text-[#949494]">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-[8px]">
            <label className="text-[14px] font-semibold text-[#0F0F10]">Model</label>
            <button style={{ border: "1px solid #E5E5E8" }}
              className="flex w-full items-center gap-[12px] rounded-[12px] px-[14px] py-[12px] text-left transition-colors hover:bg-[#FAFAFA]">
              <div className="flex h-[24px] items-center rounded-[6px] px-[6px]" style={{ backgroundColor: "#0F0F10" }}>
                <span className="text-[10px] font-bold text-white tracking-[0.04em]">AI</span>
              </div>
              <p className="text-[14px] font-medium text-[#0F0F10] flex-1">MelBand RoFormer</p>
              <ChevronRight className="h-[16px] w-[16px] text-[#BBBBC4] shrink-0" strokeWidth={2} />
            </button>
          </div>

          {/* Stability — like ElevenLabs slider */}
          <div className="space-y-[8px]">
            <label className="text-[14px] font-semibold text-[#0F0F10]">Stability</label>
            <input type="range" min={0} max={1} step={0.01} defaultValue={0.75}
              className="w-full h-[4px] accent-[#0F0F10] cursor-pointer" />
            <div className="flex justify-between">
              <span className="text-[11px] text-[#BBBBC4]">More variable</span>
              <span className="text-[11px] text-[#BBBBC4]">More stable</span>
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-[8px]">
            <label className="text-[14px] font-semibold text-[#0F0F10]">Quality</label>
            <input type="range" min={0} max={1} step={0.01} defaultValue={0.7}
              className="w-full h-[4px] accent-[#0F0F10] cursor-pointer" />
            <div className="flex justify-between">
              <span className="text-[11px] text-[#BBBBC4]">Faster</span>
              <span className="text-[11px] text-[#BBBBC4]">Higher quality</span>
            </div>
          </div>

          {/* Clean Vocals toggle */}
          <div className="flex items-center justify-between py-[4px]">
            <span className="text-[14px] text-[#0F0F10]">Clean Vocals</span>
            <button className="relative h-[22px] w-[40px] rounded-full transition-colors" style={{ backgroundColor: "#E5E5E8" }} aria-label="Toggle clean vocals">
              <div className="absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-transform" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
            </button>
          </div>

          {/* Output format */}
          <div className="space-y-[8px]">
            <label htmlFor="output-format" className="text-[14px] font-semibold text-[#0F0F10]">Output Format</label>
            <div className="relative">
              <select id="output-format" name="output-format" value={outputFormat}
                onChange={(e) => onOutputFormatChange(e.target.value as OutputFormat)}
                style={{ border: "1px solid #E5E5E8" }}
                className="w-full appearance-none rounded-[12px] bg-white px-[14px] py-[12px] pr-[40px] text-[14px] text-[#0F0F10] transition-colors hover:bg-[#FAFAFA] focus:outline-none">
                <option value="wav">WAV (Lossless)</option>
                <option value="mp3">MP3 (128kbps)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-[14px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#BBBBC4]" strokeWidth={2} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[14px] text-[#BBBBC4]">No history yet</p>
        </div>
      )}
    </aside>
  );
}
