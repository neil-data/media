import { useState, useEffect } from 'react';
import { ScreenType, TelemetryState, SystemLog, CopilotMessage, SatelliteState } from './types';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import TelemetryConsole from './components/TelemetryConsole';
import AiDiagnostics from './components/AiDiagnostics';
import SecurityConsole from './components/SecurityConsole';
import OperatorPanel from './components/OperatorPanel';
import SatelliteDashboard from './components/SatelliteDashboard';
import OperatorControlPanel from './components/OperatorControlPanel';
import { Shield, Radio, Activity, Cpu, Settings, Bell, X, Info } from './components/Icons';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<ScreenType>('satellite-dashboard');
  
  // Operator states
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [activeProtocol, setActiveProtocol] = useState<'dilithium' | 'rsa' | null>(null);

  // Satellite Configurations
  const [satState, setSatState] = useState<SatelliteState>({
    name: 'CARTOSAT-3',
    noradId: '44804',
    orbitClass: 'LEO',
    decayTimeSeconds: 2539,
    signalLock: false,
    activeKeyType: 'NONE',
    anomalyDetectionEnabled: true,
    automatedRecoveryActive: false,
  });

  // Time & GMT countdown clocks
  const [gmtClock, setGmtClock] = useState('');
  useEffect(() => {
    const clockTimer = setInterval(() => {
      const now = new Date();
      setGmtClock(now.toISOString().substring(11, 19));
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // System logs state
  const [logs, setLogs] = useState<SystemLog[]>([
    { id: '1', timestamp: '14:00:12', message: 'DSN Handshake OK — Uplink initialized', type: 'nominal', category: 'network' },
    { id: '2', timestamp: '14:01:05', message: 'Crypto key exchange: CRYSTALS-Dilithium standby', type: 'info', category: 'security' },
    { id: '3', timestamp: '14:02:10', message: 'ADCS Variance detected on Pitch Axis (+2.4° delta)', type: 'warning', category: 'attitude' },
    { id: '4', timestamp: '14:02:40', message: 'DSN Packet echo return success: 42ms', type: 'nominal', category: 'network' }
  ]);

  // AI Copilot Messages state
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    { id: '1', timestamp: '14:00:15', text: 'Analyzing attitude telemetry drift...', type: 'info' },
    { id: '2', timestamp: '14:01:30', text: 'Detected variance in attitude pitch parameters.', type: 'warning' },
    { id: '3', timestamp: '14:02:45', text: 'Warning: Attitude stabilization coils drawing high current.', type: 'alert' }
  ]);

  // Simulated live fluctuating telemetry
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    powerArray: 84.18,
    adcsPitch: 2.41,
    adcsYaw: -0.82,
    adcsStability: 'NOMINAL',
    commsBandwidth: 1.18,
    obcCpu: 42,
    obcMem: 18,
    altitude: 402.18,
    velocity: 7.672,
    lat: 32.51,
    lng: 122.36,
    temperature: 291.15
  });

  // WebSocket live telemetry stream and event subscription
  useEffect(() => {
    let wsTelemetry: WebSocket | null = null;
    let wsEvents: WebSocket | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      console.log("[WS] Connecting to telemetry and events...");
      
      wsTelemetry = new WebSocket("wss://media-3-vw51.onrender.com/ws/telemetry");
      wsEvents = new WebSocket("wss://media-3-vw51.onrender.com/ws/events");

      wsTelemetry.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Check if message is history (sent on connect) or single frame
          if (data.type === 'history') {
            const lastFrame = data.frames[data.frames.length - 1];
            if (lastFrame) {
              updateTelemetryFromFrame(lastFrame);
            }
          } else {
            updateTelemetryFromFrame(data);
          }
        } catch (err) {
          console.error("[WS Telemetry] Error parsing data:", err);
        }
      };

      wsEvents.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const timeStr = new Date(data.timestamp || Date.now()).toLocaleTimeString();
          
          if (data.event === 'fault_injected') {
            const faultType = data.payload.fault_type;
            setLogs(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, message: `CRITICAL ALERT: Fault Injected — ${faultType.toUpperCase()}`, type: 'critical', category: 'security' }
            ]);
            setCopilotMessages(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, text: `Anomaly detected on bus: ${faultType.toUpperCase()}. Satellite status changed.`, type: 'alert' }
            ]);
          } else if (data.event === 'recovery_started') {
            setLogs(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, message: `RECOVERY AGENT INITIATED: resolving fault ${data.payload.fault_type}...`, type: 'info', category: 'security' }
            ]);
          } else if (data.event === 'uplink_sent') {
            setLogs(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, message: `UPLINK PROTOCOL: Sending ${data.payload.procedure_name}...`, type: 'nominal', category: 'network' }
            ]);
          } else if (data.event === 'recovery_complete') {
            const success = data.payload.success;
            const statusStr = success ? "SUCCESS" : "FAILED";
            setLogs(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, message: `RECOVERY COMPLETED: ${statusStr}. Satellite nominal.`, type: success ? 'nominal' : 'warning', category: 'security' }
            ]);
            setCopilotMessages(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, text: success ? `Resurrection successful. All telemetry indices returned to nominal values.` : `Recovery agent execution completed with error.`, type: success ? 'success' : 'alert' }
            ]);
          } else if (data.event === 'satellite_reset') {
            setLogs(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, message: `SYSTEM REBOOT: Satellite emulator reset to default nominal.`, type: 'nominal', category: 'network' }
            ]);
            setCopilotMessages(prev => [
              ...prev,
              { id: Date.now().toString(), timestamp: timeStr, text: `Full reboot completed. Initial baseline calibration locked.`, type: 'success' }
            ]);
          }
        } catch (err) {
          console.error("[WS Events] Error parsing event data:", err);
        }
      };

      wsTelemetry.onclose = () => {
        scheduleReconnect();
      };

      wsEvents.onclose = () => {
        scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(connect, 3000);
    }

    function updateTelemetryFromFrame(frame: any) {
      setTelemetry(prev => ({
        powerArray: frame.power_w !== undefined ? frame.power_w : prev.powerArray,
        adcsPitch: frame.adcs_rate_deg_s !== undefined ? Number(frame.adcs_rate_deg_s.toFixed(4)) : prev.adcsPitch,
        adcsYaw: frame.adcs_pointing_err_deg !== undefined ? Number(frame.adcs_pointing_err_deg.toFixed(4)) : prev.adcsYaw,
        adcsStability: frame.adcs_status ? frame.adcs_status.toUpperCase() : prev.adcsStability,
        commsBandwidth: frame.comms_downlink ? 1.18 : 0.0,
        obcCpu: frame.obc_cpu_pct !== undefined ? frame.obc_cpu_pct : prev.obcCpu,
        obcMem: frame.obc_memory_pct !== undefined ? frame.obc_memory_pct : prev.obcMem,
        altitude: prev.altitude,
        velocity: prev.velocity,
        lat: prev.lat,
        lng: prev.lng,
        temperature: frame.obc_temp_c !== undefined ? frame.obc_temp_c + 273.15 : prev.temperature
      }));
    }

    connect();

    return () => {
      if (wsTelemetry) wsTelemetry.close();
      if (wsEvents) wsEvents.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Sync coordinates from 3D Globe Message Channel
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SATELLITE_TELEMETRY') {
        setTelemetry(prev => ({
          ...prev,
          lat: Number(e.data.satLat.toFixed(4)),
          lng: Number(e.data.satLng.toFixed(4))
        }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // satellite ping signal handler
  const handlePing = () => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      { id: Date.now().toString(), timestamp: timeStr, message: 'PING SATELLITE... TRANS_OK in 42ms', type: 'nominal', category: 'network' }
    ]);
    setCopilotMessages(prev => [
      ...prev,
      { id: Date.now().toString(), timestamp: timeStr, text: 'Executing link ping. Roundtrip echo packet verification nominal.', type: 'success' }
    ]);
  };

  // Auth gate check success
  const handleAuthSuccess = (opId: string, protocol: 'dilithium' | 'rsa') => {
    setOperatorId(opId);
    setActiveProtocol(protocol);
    setSatState(prev => ({
      ...prev,
      signalLock: true,
      activeKeyType: protocol === 'dilithium' ? 'DILITHIUM' : 'RSA_VULNERABLE'
    }));

    // Append authorized console log
    const timeStr = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      { id: Date.now().toString(), timestamp: timeStr, message: `ACCESS GRANTED. Operator ${opId} utilizing ${protocol.toUpperCase()}`, type: 'nominal', category: 'security' }
    ]);

    setCopilotMessages(prev => [
      ...prev,
      { id: Date.now().toString(), timestamp: timeStr, text: `Uplink secured. Operator session initialized for terminal commands controls.`, type: 'info' }
    ]);

    setCurrentRoute('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] select-none overflow-x-hidden">
      
      {/* Route Switcher */}
      {currentRoute === 'landing' && (
        <LandingPage 
          satState={satState}
          onStartRecovery={() => setCurrentRoute('auth')}
        />
      )}

      {currentRoute === 'auth' && (
        <AuthScreen 
          onAuthSuccess={handleAuthSuccess}
          onCancel={() => setCurrentRoute('landing')}
        />
      )}

      {currentRoute === 'dashboard' && (
        <div className="min-h-screen flex flex-col pt-16">
          
          {/* TOP MISSION HEADER BAR */}
          <header className="fixed top-0 left-0 w-full h-16 bg-[#0D0D0D]/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-50 shadow-md">
            <div className="flex items-center gap-4">
              <span className="font-display text-base font-black text-signal-green tracking-tighter uppercase">
                DEADSAT-RESURRECTION
              </span>
              
              {/* Heartbeat Uptime status lines */}
              <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-4 h-full">
                <span className="font-mono text-[10px] text-[#D4D4D4]/60 font-bold">SYS_HEALTH:</span>
                <svg viewBox="0 0 100 20" height="20" width="60" className="stroke-signal-green fill-none stroke-2">
                  <path className="heartbeat-path" d="M0,10 L20,10 L30,2 L40,18 L50,10 L100,10" />
                </svg>
              </div>
            </div>

            {/* Quick clock feeds */}
            <div className="flex items-center gap-6 font-mono text-xs">
              <div className="hidden sm:block text-signal-green tracking-widest animate-pulse font-bold">
                GMT: {gmtClock || '14:02:45'} | T-00:15:30
              </div>

              {/* Logged in operators credentials profile */}
              {operatorId && (
                <div className="bg-signal-green/10 text-signal-green px-3 py-1 pb-1.5 border border-signal-green/35 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 rounded-sm">
                  <span className="w-1.5 h-1.5 bg-signal-green rounded-full"></span>
                  <span>{operatorId}</span>
                </div>
              )}

              <button 
                onClick={() => {
                  fetch("https://media-3-vw51.onrender.com/reset", { method: "POST" })
                    .catch(err => console.error("Error resetting:", err));
                  setCurrentRoute('landing');
                }}
                className="bg-[#1A1A1A] border border-white/15 text-[#D4D4D4] text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-sm hover:border-threat-red hover:text-threat-red transition-all cursor-pointer font-sans"
              >
                ABORT / REBOOT
              </button>
            </div>
          </header>

          {/* SIDEBAR NAVIGATION + DENSE DASHBOARD CONTAINER SCREEN */}
          <div className="flex-1 flex flex-row relative">
            
            {/* LEFT COMPACT SIDEBAR NAVIGATION PANEL */}
            <aside className="fixed left-0 top-16 bottom-0 w-[80px] md:w-[260px] bg-[#131313]/95 border-r border-white/10 flex flex-col py-6 px-3 z-40 transition-all duration-300">
              
              <div className="px-3 mb-8 whitespace-nowrap overflow-hidden">
                <div className="font-display font-black text-sm text-signal-green uppercase tracking-wide truncate">
                  RECOVERY-01
                </div>
                <div className="font-mono text-[9px] text-[#4fc3f7] mt-0.5 tracking-wider uppercase font-bold">
                  STATUS: {telemetry.adcsStability === 'NOMINAL' ? 'NOMINAL' : 'HARDWARE_ALERT'}
                </div>
              </div>

              {/* Tab options lists */}
              <nav className="flex-1 space-y-2">
                <button 
                  onClick={() => setActiveTab('satellite-dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all border-l-2 ${
                    activeTab === 'satellite-dashboard'
                      ? 'border-signal-green bg-signal-green/10 text-signal-green font-black tracking-wider'
                      : 'border-transparent text-[#D4D4D4] hover:text-white'
                  }`}
                >
                  <Activity className="w-5 h-5 text-signal-green" />
                  <span className="hidden md:block font-mono text-[11px] font-bold uppercase tracking-wider font-display">Satellite Dashboard</span>
                </button>



                <button 
                  onClick={() => setActiveTab('telemetry')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all border-l-2 ${
                    activeTab === 'telemetry'
                      ? 'border-signal-green bg-signal-green/10 text-signal-green font-black tracking-wider'
                      : 'border-transparent text-[#D4D4D4] hover:text-white'
                  }`}
                >
                  <Radio className="w-5 h-5" />
                  <span className="hidden md:block font-mono text-[11px] font-bold uppercase tracking-wider font-display">Telemetry Live</span>
                </button>

                <button 
                  onClick={() => setActiveTab('diagnostics')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all border-l-2 ${
                    activeTab === 'diagnostics'
                      ? 'border-signal-green bg-signal-green/10 text-signal-green font-black tracking-wider'
                      : 'border-transparent text-[#D4D4D4] hover:text-white'
                  }`}
                >
                  <Cpu className="w-5 h-5" />
                  <span className="hidden md:block font-mono text-[11px] font-bold uppercase tracking-wider font-display">AI Diagnostics</span>
                </button>

                <button 
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all border-l-2 ${
                    activeTab === 'security'
                      ? 'border-signal-green bg-signal-green/10 text-signal-green font-black tracking-wider'
                      : 'border-transparent text-[#D4D4D4] hover:text-white'
                  }`}
                >
                  <Shield className="w-5 h-5" />
                  <span className="hidden md:block font-mono text-[11px] font-bold uppercase tracking-wider font-display">PQC Security</span>
                </button>

                <button 
                  onClick={() => setActiveTab('operator')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all border-l-2 ${
                    activeTab === 'operator'
                      ? 'border-signal-green bg-signal-green/10 text-signal-green font-black tracking-wider'
                      : 'border-transparent text-[#D4D4D4] hover:text-white'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="hidden md:block font-mono text-[11px] font-bold uppercase tracking-wider font-display">Cmd Operator</span>
                </button>


              </nav>

              {/* Small branding footer tags */}
              <div className="mt-auto px-3 border-t border-white/10 pt-4 hidden md:block">
                <div className="font-mono text-[8px] text-[#D4D4D4]/40 uppercase leading-normal">
                  STN_LOC: NEW DELHI_HQ
                </div>
                <div className="font-mono text-[8px] text-[#D4D4D4]/40 uppercase mt-0.5">
                  LAT: 28.61 / LNG: 77.20
                </div>
              </div>
            </aside>

            {/* MAIN INTERACTIVE GRAPH CANVAS CONTAINER ROUTING */}
            <main className="ml-[80px] md:ml-[260px] flex-1 p-6 lg:p-8 bg-[#0D0D0D] relative min-h-[calc(100vh-64px)] flex flex-col">
              
              {/* Scanline grid laser */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-grid opacity-10"></div>

              {/* Live Sub Tab Content matching select selection */}
              <div className="relative z-10 flex-1 flex flex-col">
                {activeTab === 'satellite-dashboard' && (
                  <div className="flex flex-col gap-6">
                    <SatelliteDashboard />
                    <div className="border-t border-white/10 pt-6">
                      <OperatorControlPanel />
                    </div>
                  </div>
                )}

                {activeTab === 'telemetry' && (
                  <TelemetryConsole 
                    telemetry={telemetry}
                    onPing={handlePing}
                    logs={logs}
                    copilotMessages={copilotMessages}
                  />
                )}

                {activeTab === 'diagnostics' && (
                  <AiDiagnostics />
                )}

                {activeTab === 'security' && (
                  <SecurityConsole />
                )}

                {activeTab === 'operator' && (
                  <OperatorPanel />
                )}


              </div>
            </main>

          </div>
        </div>
      )}

    </div>
  );
}
