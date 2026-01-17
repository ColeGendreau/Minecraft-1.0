'use client';

import { useState, useEffect } from 'react';

// Service blocks with Minecraft-style colors
const AZURE_BLOCKS = [
  { id: 'rg', name: 'Resource Group', color: '#4A90D9', icon: '📁', row: 0, col: 1 },
  { id: 'vnet', name: 'Virtual Network', color: '#0078D4', icon: '🌐', row: 1, col: 0 },
  { id: 'aks', name: 'Kubernetes', color: '#326CE5', icon: '⚙️', row: 1, col: 1 },
  { id: 'acr', name: 'Container Registry', color: '#0089D6', icon: '📦', row: 1, col: 2 },
  { id: 'ingress', name: 'Ingress', color: '#009688', icon: '🚪', row: 2, col: 0 },
  { id: 'minecraft', name: 'Minecraft', color: '#5D9B3F', icon: '🎮', row: 2, col: 1 },
  { id: 'monitoring', name: 'Monitoring', color: '#FF9800', icon: '📊', row: 2, col: 2 },
  { id: 'grafana', name: 'Grafana', color: '#F46800', icon: '📈', row: 3, col: 1 },
];

interface BlockBuildAnimationProps {
  isBuilding: boolean;
  isDestroying?: boolean;
  progress: number; // 0-100
  onComplete?: () => void;
}

export function BlockBuildAnimation({ 
  isBuilding, 
  isDestroying = false,
  progress,
}: BlockBuildAnimationProps) {
  const [builtBlocks, setBuiltBlocks] = useState<string[]>([]);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  // Calculate which blocks should be visible based on progress
  useEffect(() => {
    if (isBuilding || isDestroying) {
      const totalBlocks = AZURE_BLOCKS.length;
      const blocksToShow = Math.floor((progress / 100) * totalBlocks);
      
      if (isDestroying) {
        // Reverse order for destroying
        const blocksVisible = AZURE_BLOCKS.slice(0, totalBlocks - blocksToShow).map(b => b.id);
        setBuiltBlocks(blocksVisible);
      } else {
        // Normal order for building
        const blocksVisible = AZURE_BLOCKS.slice(0, blocksToShow).map(b => b.id);
        setBuiltBlocks(blocksVisible);
      }
    } else if (progress === 100) {
      setBuiltBlocks(AZURE_BLOCKS.map(b => b.id));
    } else {
      setBuiltBlocks([]);
    }
  }, [isBuilding, isDestroying, progress]);

  // Spawn particles when blocks are placed
  useEffect(() => {
    if (builtBlocks.length > 0 && isBuilding) {
      const lastBlock = AZURE_BLOCKS.find(b => b.id === builtBlocks[builtBlocks.length - 1]);
      if (lastBlock) {
        // Create particles
        const newParticles = Array.from({ length: 6 }, (_, i) => ({
          id: Date.now() + i,
          x: lastBlock.col * 80 + 40 + (Math.random() - 0.5) * 40,
          y: lastBlock.row * 60 + 30,
          color: lastBlock.color,
        }));
        setParticles(prev => [...prev, ...newParticles]);
        
        // Clean up particles after animation
        setTimeout(() => {
          setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
        }, 1000);
      }
    }
  }, [builtBlocks.length, isBuilding]);

  return (
    <div className="relative w-full h-64 overflow-hidden rounded-lg bg-gradient-to-b from-sky-900 to-slate-900">
      {/* Sky background with stars */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 50}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.5 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>

      {/* Ground */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-8"
        style={{
          background: 'linear-gradient(180deg, #5D9B3F 0%, #3D6B2F 30%, #8B5A2B 30%, #5D3A1A 100%)',
        }}
      />

      {/* Block Building Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="relative"
          style={{ 
            width: '240px', 
            height: '240px',
            transform: 'perspective(500px) rotateX(10deg)',
          }}
        >
          {AZURE_BLOCKS.map((block) => {
            const isBuilt = builtBlocks.includes(block.id);
            const isLatest = builtBlocks[builtBlocks.length - 1] === block.id;
            
            return (
              <div
                key={block.id}
                className="absolute transition-all duration-500 ease-out"
                style={{
                  left: `${block.col * 80}px`,
                  bottom: `${block.row * 60}px`,
                  transform: isBuilt 
                    ? `translateY(0) scale(1) ${isLatest ? 'translateY(-5px)' : ''}`
                    : 'translateY(-100px) scale(0.5)',
                  opacity: isBuilt ? 1 : 0,
                }}
              >
                {/* 3D Minecraft Block */}
                <div 
                  className="relative w-16 h-16 cursor-pointer group"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Top face */}
                  <div 
                    className="absolute w-16 h-4 origin-bottom"
                    style={{
                      background: `linear-gradient(135deg, ${block.color} 0%, ${adjustColor(block.color, -20)} 100%)`,
                      transform: 'rotateX(60deg) translateY(-16px)',
                      boxShadow: `inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.2)`,
                    }}
                  />
                  
                  {/* Front face */}
                  <div 
                    className="absolute w-16 h-12 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(180deg, ${block.color} 0%, ${adjustColor(block.color, -30)} 100%)`,
                      top: '4px',
                      boxShadow: `inset 2px 2px 0 rgba(255,255,255,0.2), inset -2px -2px 0 rgba(0,0,0,0.3)`,
                    }}
                  >
                    <span className="text-2xl drop-shadow-lg">{block.icon}</span>
                  </div>
                  
                  {/* Right face */}
                  <div 
                    className="absolute w-4 h-12 origin-left"
                    style={{
                      background: `linear-gradient(180deg, ${adjustColor(block.color, -20)} 0%, ${adjustColor(block.color, -40)} 100%)`,
                      left: '64px',
                      top: '4px',
                      transform: 'skewY(-30deg)',
                    }}
                  />

                  {/* Pulse effect for latest block */}
                  {isLatest && isBuilding && (
                    <div 
                      className="absolute inset-0 rounded animate-ping"
                      style={{ 
                        background: block.color,
                        opacity: 0.3,
                      }}
                    />
                  )}

                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="mc-tooltip whitespace-nowrap text-xs">
                      {block.name}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-sm animate-particle"
          style={{
            left: `calc(50% - 120px + ${particle.x}px)`,
            bottom: `${32 + particle.y}px`,
            background: particle.color,
            boxShadow: `0 0 4px ${particle.color}`,
          }}
        />
      ))}

      {/* Progress bar */}
      <div className="absolute bottom-10 left-4 right-4">
        <div className="h-3 bg-black/50 rounded-full overflow-hidden border-2 border-gray-700">
          <div 
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: isDestroying 
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : 'linear-gradient(90deg, #10b981, #059669)',
              boxShadow: isDestroying
                ? '0 0 10px rgba(239,68,68,0.5)'
                : '0 0 10px rgba(16,185,129,0.5)',
            }}
          />
        </div>
        <p className="text-center text-xs text-gray-400 mt-1 font-mono">
          {isDestroying ? '💥 Destroying' : '🔨 Building'}: {progress}%
        </p>
      </div>

      {/* Status text */}
      <div className="absolute top-4 left-4 right-4 text-center">
        <p 
          className="text-sm text-emerald-400 font-bold"
          style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '10px' }}
        >
          {progress === 100 
            ? (isDestroying ? '💀 DESTROYED' : '✅ COMPLETE')
            : `${builtBlocks.length}/${AZURE_BLOCKS.length} SERVICES`
          }
        </p>
      </div>

      {/* CSS for particle animation */}
      <style jsx>{`
        @keyframes particle {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-50px) scale(0);
            opacity: 0;
          }
        }
        .animate-particle {
          animation: particle 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Helper to adjust color brightness
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

// Compact inline version for the infrastructure panel
export function MiniBlockProgress({ progress, isDestroying = false }: { progress: number; isDestroying?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-2">
      {AZURE_BLOCKS.slice(0, 8).map((block, i) => {
        const blockProgress = (i / 8) * 100;
        const isBuilt = progress > blockProgress;
        
        return (
          <div
            key={block.id}
            className={`
              w-8 h-8 rounded transition-all duration-300 flex items-center justify-center text-lg
              ${isBuilt 
                ? 'scale-100 opacity-100' 
                : 'scale-75 opacity-30'
              }
              ${isDestroying && isBuilt ? 'animate-pulse' : ''}
            `}
            style={{
              background: isBuilt ? block.color : '#333',
              boxShadow: isBuilt ? `0 2px 8px ${block.color}40, inset 1px 1px 0 rgba(255,255,255,0.3)` : 'none',
              transitionDelay: `${i * 50}ms`,
            }}
            title={block.name}
          >
            {block.icon}
          </div>
        );
      })}
    </div>
  );
}

