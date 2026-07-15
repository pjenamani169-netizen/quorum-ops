import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { jsPDF } from 'jspdf';
import {
  LayoutDashboard,
  Receipt,
  ChefHat,
  Users,
  Sliders,
  Plus,
  HelpCircle,
  LogOut,
  ArrowLeft,
  Bell,
  Settings,
  Pencil,
  X,
  QrCode,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Check,
  ChevronRight,
  ShoppingBag,
  Trash2,
  Lock,
  Mail,
  KeyRound,
  Sparkles,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Camera,
  Upload,
  Download,
  Printer,
  FileText
} from 'lucide-react';

// --- TypeScript Types ---
interface StaffMember {
  id: string;
  name: string;
  role: 'Chef' | 'Waiter' | 'Manager' | 'Owner';
  pin: string;
  status: 'Active' | 'Deactivated';
  joined: string;
  authorized: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Starters' | 'Mains' | 'Drinks' | 'Desserts';
  image: string;
}

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  table: string;
  items: OrderItem[];
  status: 'received' | 'preparing' | 'ready' | 'served' | 'paid';
  total: number;
  time: string;
  notes?: string;
  customerName?: string;
}

interface PaymentNotification {
  id: string;
  orderId: string;
  amount?: number;
  table: string;
  timestamp: string;
  type?: 'payment' | 'kitchen-ready';
  message?: string;
}

// --- Menu Items Dataset ---
const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Truffle Parmesan Fries',
    description: 'Thick-cut rustic potatoes, white truffle oil, grated Parmigiano-Reggiano, fresh parsley, roasted garlic aioli.',
    price: 299.00,
    category: 'Starters',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'm2',
    name: 'Signature Wagyu Burger',
    description: 'Aged American Wagyu beef, toasted brioche bun, double sharp cheddar, caramelized balsamic onions, house truffle sauce.',
    price: 650.00,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'm3',
    name: 'Smoked Lemon Salmon',
    description: 'Pan-seared Atlantic salmon, citrus yuzu glaze, grilled tender asparagus, wild herb-infused quinoa pilaf.',
    price: 890.00,
    category: 'Mains',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'm4',
    name: 'Craft Mezcal Paloma',
    description: 'Artisanal Mezcal Joven, fresh-squeezed grapefruit juice, lime, pure organic agave, hand-harvested pink sea salt rim.',
    price: 350.00,
    category: 'Drinks',
    image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'm5',
    name: 'Espresso Martini Royale',
    description: 'Single-origin cold brew espresso, smooth premium vodka, toasted coffee liqueur, vanilla-bean infused syrup.',
    price: 450.00,
    category: 'Drinks',
    image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'm6',
    name: 'Citrus Lemon Tart',
    description: 'Sweet buttery shortcrust pastry, tangy house lemon curd, finished with light toasted Italian meringue.',
    price: 250.00,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&q=40&w=400'
  }
];

// --- Audio Feedback Generator (Self-Contained Web Audio Synthesizer) ---
const playBeep = (freq = 800, duration = 0.08, type: OscillatorType = 'sine') => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Blocked or unsupported
  }
};

const playChime = (success: boolean) => {
  if (success) {
    playBeep(523.25, 0.1); // C5
    setTimeout(() => playBeep(659.25, 0.1), 100); // E5
    setTimeout(() => playBeep(783.99, 0.15), 200); // G5
  } else {
    playBeep(220, 0.15, 'triangle'); // A3
    setTimeout(() => playBeep(180, 0.25, 'triangle'), 150); // F#3
  }
};

interface NotificationToastProps {
  notif: PaymentNotification;
  onDismiss: (id: string) => void;
  key?: any;
}

function NotificationToast({ notif, onDismiss }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notif.id);
    }, 7500); // 7.5 seconds (between 7 and 8 seconds)
    return () => clearTimeout(timer);
  }, [notif.id, onDismiss]);

  const isKitchenReady = notif.type === 'kitchen-ready';

  return (
    <div
      id={`notif-${notif.id}`}
      className={`bg-black/60 border ${
        isKitchenReady ? 'border-primary/40 shadow-primary/10' : 'border-[#352622]/40'
      } text-[#e2e2e2] rounded-xl p-4 shadow-2xl flex items-start gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 hover:bg-black/80 transition-all`}
    >
      {isKitchenReady ? (
        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <ChefHat className="w-4.5 h-4.5" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0 mt-0.5">
          <Check className="w-4.5 h-4.5 stroke-[3]" />
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`font-display font-extrabold text-[10px] tracking-wider uppercase ${isKitchenReady ? 'text-primary' : 'text-neutral-400'}`}>
            {isKitchenReady ? 'MEAL READY FROM KITCHEN' : 'PAYMENT VERIFIED'}
          </span>
          <button
            onClick={() => onDismiss(notif.id)}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {isKitchenReady ? (
          <div className="mt-1">
            <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
              {notif.message}
            </p>
            <div className="mt-2 flex items-center justify-between bg-zinc-900/40 p-2 rounded-lg border border-zinc-850/40">
              <span className="text-[10px] text-neutral-400 font-mono">Table: <strong className="text-white">{notif.table}</strong></span>
              <button
                onClick={() => onDismiss(notif.id)}
                className="text-[9px] bg-primary text-black font-extrabold px-2 py-1 rounded hover:opacity-90 transition-opacity font-mono uppercase"
              >
                Acknowledge
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-neutral-400 mt-1">
              Order <span className="font-mono text-[#ffb5a0] font-bold">#{notif.orderId}</span> ({notif.table})
            </p>
            <p className="font-mono font-bold text-lg text-success mt-1">
              ₹{(notif.amount ?? 0).toFixed(2)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// --- Dedicated QR Code Generator Helper Component ---
const TableQRCodeComponent: React.FC<{ 
  table: string; 
  size?: number; 
  color?: string; 
  onGenerated?: (url: string) => void 
}> = ({ table, size = 200, color = '#d45129', onGenerated }) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    // Generate URL with table query parameter mapping
    const text = `${window.location.origin}${window.location.pathname}?table=${encodeURIComponent(table)}`;
    QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: color,
        light: '#ffffff'
      }
    })
    .then(url => {
      setQrSrc(url);
      if (onGenerated) onGenerated(url);
    })
    .catch(err => {
      console.error("QR Code Generation failed", err);
    });
  }, [table, size, color, onGenerated]);

  if (!qrSrc) {
    return (
      <div className="flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg animate-pulse" style={{ width: size, height: size }}>
        <RefreshCw className="w-5 h-5 text-neutral-600 animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={qrSrc}
      alt={`QR Code for ${table}`}
      className="rounded-lg shadow-md bg-white border border-zinc-100"
      style={{ width: size, height: size }}
    />
  );
};

export default function App() {
  // --- Core Application Perspectives ---
  // 'landing' -> The main public page from mockup #1
  // 'pin-login' -> Staff console authorization from mockup #2
  // 'staff-portal' -> Operational dashboards from mockup #3
  // 'guest-menu' -> QR customer interactive ordering flow
  // 'order-tracking' -> Live order transparency for customer
  const [perspective, setPerspective] = useState<'landing' | 'pin-login' | 'staff-portal' | 'guest-menu' | 'order-tracking'>(() => {
    const activeId = localStorage.getItem('quorum_active_order_id');
    if (activeId) {
      return 'order-tracking';
    }
    return 'landing';
  });

  // --- Guest Order Tracking States ---
  const [guestName, setGuestName] = useState<string>(() => localStorage.getItem('quorum_guest_name') || '');
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState<string>(() => localStorage.getItem('quorum_active_order_id') || '');

  // --- QR Scanner & Generator States ---
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [qrScannerError, setQrScannerError] = useState<string>('');
  const [qrSelectedTable, setQrSelectedTable] = useState<string>('Table 1');
  const [qrSize, setQrSize] = useState<number>(250);
  const [qrColor, setQrColor] = useState<string>('#d45129'); // Quorum Crimson
  const [qrLabelEnabled, setQrLabelEnabled] = useState<boolean>(true);
  const [qrLogoEnabled, setQrLogoEnabled] = useState<boolean>(true);
  const [simulatedScanActive, setSimulatedScanActive] = useState<string>('');
  const [previewSrc, setPreviewSrc] = useState<string>('');

  // States for PDF multi-sticker batch printing sheet
  const [sheetTables, setSheetTables] = useState<string[]>(['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6']);
  const [customTablesToSheet, setCustomTablesToSheet] = useState<string[]>([]);
  const [newCustomTableInput, setNewCustomTableInput] = useState<string>('');

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Auto-route guest from URL QR parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      const formatted = decodeURIComponent(tableParam);
      if (formatted.toLowerCase().startsWith('table ') || formatted.length > 0) {
        playChime(true);
        setSelectedTableForGuest(formatted);
        setPerspective('guest-menu');
        // Clean URL parameter silently
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Manage Video Stream for Scanner
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    let animationFrameId: number;
    let localStream: MediaStream | null = null;

    const startCamera = async () => {
      if (!isQrScannerOpen) return;
      try {
        setQrScannerError('');
        const constraints = {
          video: { facingMode: 'environment' }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          setCameraActive(true);
        }
        animationFrameId = requestAnimationFrame(scanLoop);
      } catch (err: any) {
        console.warn("Webcam access failed/blocked. Falling back gracefully.", err);
        setQrScannerError(
          "Camera access is unavailable. Please upload a QR code image or try our instant Simulator Scanner below!"
        );
      }
    };

    const scanLoop = () => {
      if (!isQrScannerOpen || !videoRef.current) return;
      
      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            handleScanSuccess(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanLoop);
    };

    if (isQrScannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isQrScannerOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleScanSuccess = (decodedData: string) => {
    playChime(true);
    stopCamera();
    setIsQrScannerOpen(false);

    let detectedTable = 'Table 1';
    try {
      if (decodedData.includes('table=')) {
        const urlObj = new URL(decodedData.startsWith('http') ? decodedData : 'http://localhost' + decodedData);
        const tab = urlObj.searchParams.get('table');
        if (tab) detectedTable = tab;
      } else if (decodedData.toLowerCase().startsWith('table ')) {
        detectedTable = decodedData;
      } else if (['1','2','3','4','5','6'].includes(decodedData.trim())) {
        detectedTable = 'Table ' + decodedData.trim();
      } else {
        detectedTable = decodedData;
      }
    } catch (e) {
      detectedTable = decodedData;
    }

    if (detectedTable.length > 25) {
      detectedTable = detectedTable.substring(0, 25);
    }

    setSelectedTableForGuest(detectedTable);
    setPerspective('guest-menu');

    // Display a welcoming toast message
    const newNotif: PaymentNotification = {
      id: 'qr-scan-' + Date.now(),
      orderId: 'QR-SCAN',
      table: detectedTable,
      timestamp: 'Just now',
      type: 'kitchen-ready',
      message: `Table Scan Succeeded! Welcomed to ${detectedTable}. Please browse our high-end Wagyu selections.`
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            handleScanSuccess(code.data);
          } else {
            alert("No valid table QR Code found in this image. Please upload a high-quality table QR label!");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSimulateScan = (tableName: string) => {
    playBeep(900, 0.08);
    setSimulatedScanActive(tableName);
    setTimeout(() => {
      handleScanSuccess(tableName);
      setSimulatedScanActive('');
    }, 1200);
  };

  const handlePrintQR = (tableLabel: string, qrBase64: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker prevented printing. Please allow popups or use 'Download PNG'!");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Label - ${tableLabel}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fff;
              color: #000;
            }
            .sticker-card {
              border: 3px solid #000;
              border-radius: 20px;
              padding: 40px;
              text-align: center;
              max-width: 350px;
              box-shadow: none;
            }
            .brand {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: 4px;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 10px;
              font-weight: bold;
              letter-spacing: 2px;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 25px;
            }
            .qr-img {
              width: 220px;
              height: 220px;
              margin-bottom: 25px;
            }
            .table-num {
              font-size: 32px;
              font-weight: 900;
              letter-spacing: -0.5px;
              margin-bottom: 5px;
            }
            .instructions {
              font-size: 11px;
              font-weight: 600;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="brand">QUORUM</div>
            <div class="subtitle">Digital Ordering Station</div>
            <img class="qr-img" src="${qrBase64}" />
            <div class="table-num">${tableLabel.toUpperCase()}</div>
            <div class="instructions">Scan to Browse Menu, Order &amp; Pay</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQR = (tableLabel: string, qrBase64: string) => {
    const link = document.createElement('a');
    link.href = qrBase64;
    link.download = `quorum-qr-${tableLabel.toLowerCase().replace(' ', '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playChime(true);
  };

  const generateMultiStickersPDF = async () => {
    const tablesToGenerate = [...sheetTables, ...customTablesToSheet];
    if (tablesToGenerate.length === 0) {
      alert("Please select at least one table to generate the sticker sheet PDF.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const cols = 2;
      const rows = 3;
      const stickerWidth = 85;
      const stickerHeight = 82;
      const hGap = 10;
      const vGap = 8;
      
      const leftMargin = (pageWidth - (cols * stickerWidth + (cols - 1) * hGap)) / 2;
      const topMargin = (pageHeight - (rows * stickerHeight + (rows - 1) * vGap)) / 2;

      for (let i = 0; i < tablesToGenerate.length; i++) {
        const table = tablesToGenerate[i];
        const pageIdx = Math.floor(i / (cols * rows));
        const indexOnPage = i % (cols * rows);
        const colIdx = indexOnPage % cols;
        const rowIdx = Math.floor(indexOnPage / cols);

        if (pageIdx > 0 && indexOnPage === 0) {
          doc.addPage();
        }

        const x = leftMargin + colIdx * (stickerWidth + hGap);
        const y = topMargin + rowIdx * (stickerHeight + vGap);

        // Dashed border (representing the sticker cut lines)
        doc.setLineWidth(0.4);
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([2, 2], 0);
        doc.rect(x, y, stickerWidth, stickerHeight);
        doc.setLineDashPattern([], 0);

        // Solid inner background
        doc.setFillColor(255, 255, 255);
        doc.rect(x + 1, y + 1, stickerWidth - 2, stickerHeight - 2, 'F');

        // Brand Title: "QUORUM"
        doc.setTextColor(20, 20, 20);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(15);
        const brandY = y + 10;
        doc.text("QUORUM", x + stickerWidth / 2, brandY, { align: 'center' });

        // Subtitle: "DIGITAL ORDERING STATION"
        doc.setTextColor(120, 120, 120);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6);
        const subY = brandY + 4;
        doc.text("DIGITAL ORDERING STATION", x + stickerWidth / 2, subY, { align: 'center' });

        // Draw a tiny solid accent bar
        doc.setFillColor(212, 81, 41); // #d45129
        doc.rect(x + stickerWidth / 2 - 12, subY + 2.5, 24, 0.6, 'F');

        // Generate dynamic QR Code URL
        const qrUrl = `${window.location.origin}${window.location.pathname}?table=${encodeURIComponent(table)}`;
        const qrBase64 = await QRCode.toDataURL(qrUrl, {
          width: 250,
          margin: 1,
          color: {
            dark: qrColor,
            light: '#ffffff'
          }
        });

        // Add QR image to PDF (38mm size)
        const qrSizeMM = 38;
        const qrX = x + (stickerWidth - qrSizeMM) / 2;
        const qrY = subY + 6;
        doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSizeMM, qrSizeMM);

        // Center badge 'Q'
        if (qrLogoEnabled) {
          const badgeSizeMM = 6;
          const badgeX = qrX + (qrSizeMM - badgeSizeMM) / 2;
          const badgeY = qrY + (qrSizeMM - badgeSizeMM) / 2;
          
          doc.setFillColor(255, 255, 255);
          doc.rect(badgeX, badgeY, badgeSizeMM, badgeSizeMM, 'F');
          
          doc.setLineWidth(0.3);
          doc.setDrawColor(20, 20, 20);
          doc.rect(badgeX, badgeY, badgeSizeMM, badgeSizeMM, 'S');
          
          doc.setTextColor(20, 20, 20);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text("Q", badgeX + badgeSizeMM / 2, badgeY + badgeSizeMM / 2 + 1.2, { align: 'center' });
        }

        // Table Number Label
        doc.setTextColor(20, 20, 20);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(15);
        const tableY = qrY + qrSizeMM + 7;
        doc.text(table.toUpperCase(), x + stickerWidth / 2, tableY, { align: 'center' });

        // Footer Instructions
        doc.setTextColor(100, 100, 100);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        const instY = tableY + 4.5;
        doc.text("Scan to Browse Menu, Order & Pay", x + stickerWidth / 2, instY, { align: 'center' });
      }

      doc.save(`quorum-table-qr-stickers.pdf`);
      playChime(true);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate sticker sheet PDF. Please try again.");
    }
  };

  // --- Login State ---
  const [loginMethod, setLoginMethod] = useState<'PIN' | 'Email'>('PIN');
  const [pinInput, setPinInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);

  // --- Portal Context Tabs ---
  // 'overview' | 'live-orders' | 'kitchen' | 'staff' | 'settings' | 'qr-station'
  const [activeTab, setActiveTab] = useState<'overview' | 'live-orders' | 'kitchen' | 'staff' | 'settings' | 'qr-station'>('staff');

  // --- Live Synchronized Database State ---
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: 's1',
      name: 'Marco Andretti',
      role: 'Chef',
      pin: '8829',
      status: 'Active',
      joined: 'March 2023',
      authorized: true,
    },
    {
      id: 's2',
      name: 'Sarah Lopez',
      role: 'Waiter',
      pin: '1044',
      status: 'Active',
      joined: 'Jan 2024',
      authorized: true,
    },
    {
      id: 's3',
      name: 'James Kim',
      role: 'Waiter',
      pin: '----',
      status: 'Deactivated',
      joined: 'Terminated Aug 2023',
      authorized: false,
    },
    {
      id: 's4',
      name: 'Alex Mercer',
      role: 'Owner',
      pin: '9999',
      status: 'Active',
      joined: 'Oct 2021',
      authorized: true,
    }
  ]);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('quorum_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: '1284',
        table: 'Table 3',
        items: [
          { name: 'Signature Wagyu Burger', qty: 4, price: 650.00 },
          { name: 'Truffle Parmesan Fries', qty: 3, price: 299.00 },
          { name: 'Craft Mezcal Paloma', qty: 2, price: 350.00 }
        ],
        status: 'paid',
        total: 4197.00,
        time: '10:42 PM',
        notes: 'No onions on one burger'
      },
      {
        id: '1285',
        table: 'Table 4',
        items: [
          { name: 'Signature Wagyu Burger', qty: 1, price: 650.00 },
          { name: 'Truffle Parmesan Fries', qty: 1, price: 299.00 }
        ],
        status: 'preparing',
        total: 949.00,
        time: '11:38 PM',
        notes: 'Fries extra crispy'
      },
      {
        id: '1286',
        table: 'Table 1',
        items: [
          { name: 'Espresso Martini Royale', qty: 2, price: 450.00 },
          { name: 'Citrus Lemon Tart', qty: 1, price: 250.00 }
        ],
        status: 'ready',
        total: 1150.00,
        time: '11:43 PM'
      }
    ];
  });

  // --- Real-time Notifications & Toast Feed ---
  const [notifications, setNotifications] = useState<PaymentNotification[]>(() => {
    const saved = localStorage.getItem('quorum_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'n1',
        orderId: '1284',
        amount: 142.00,
        table: 'Table 3',
        timestamp: 'Just now'
      }
    ];
  });

  // --- Real-time LocalStorage Synchronization ---
  useEffect(() => {
    localStorage.setItem('quorum_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('quorum_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quorum_orders' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setOrders(parsed);
        } catch (err) {
          console.error(err);
        }
      }
      if (e.key === 'quorum_notifications' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setNotifications(parsed);
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // --- Simulation & UI Controls ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState<boolean>(false);
  const [selectedTableForGuest, setSelectedTableForGuest] = useState<string>('Table 1');
  const [guestCart, setGuestCart] = useState<{ [key: string]: number }>({});
  const [guestNotes, setGuestNotes] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'Starters' | 'Mains' | 'Drinks' | 'Desserts'>('Starters');
  
  // Custom manual order drawer state inside portal
  const [isNewManualOrderOpen, setIsNewManualOrderOpen] = useState<boolean>(false);
  const [manualOrderTable, setManualOrderTable] = useState<string>('Table 1');
  const [manualOrderCart, setManualOrderCart] = useState<{ [key: string]: number }>({});

  // --- Staff Modal Inputs ---
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Chef' | 'Waiter' | 'Manager' | 'Owner'>('Chef');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffImmediateAccess, setNewStaffImmediateAccess] = useState(true);

  // --- Reactive calculations for Dashboard KPI widgets ---
  const metrics = useMemo(() => {
    const activeNow = staffMembers.filter(s => s.status === 'Active').length + 8; // Offset to match design #12
    const totalStaff = staffMembers.length + 20; // Offset to match design #24
    const pendingOrders = orders.filter(o => o.status === 'preparing').length;
    const efficiency = 94; // Premium hospitality benchmark constant

    return {
      activeNow,
      totalStaff,
      pendingOrders,
      efficiency
    };
  }, [staffMembers, orders]);

  // --- Close toast message after time delay ---
  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    playBeep(400, 0.05);
  };

  // --- Staff Personnel Management ---
  const handleToggleAuthorization = (id: string) => {
    playBeep(900, 0.06);
    setStaffMembers(prev => prev.map(member => {
      if (member.id === id) {
        const nextAuth = !member.authorized;
        return {
          ...member,
          authorized: nextAuth,
          status: nextAuth ? 'Active' : 'Deactivated',
          pin: nextAuth ? (member.pin === '----' ? Math.floor(1000 + Math.random() * 9000).toString() : member.pin) : '----'
        };
      }
      return member;
    }));
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPin || newStaffPin.length !== 4) {
      playChime(false);
      alert('Please fill out all fields with a valid 4-digit system PIN.');
      return;
    }

    const newMember: StaffMember = {
      id: 's' + (staffMembers.length + 1),
      name: newStaffName,
      role: newStaffRole,
      pin: newStaffImmediateAccess ? newStaffPin : '----',
      status: newStaffImmediateAccess ? 'Active' : 'Deactivated',
      joined: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      authorized: newStaffImmediateAccess
    };

    setStaffMembers(prev => [...prev, newMember]);
    setIsAddStaffOpen(false);
    playChime(true);

    // Reset fields
    setNewStaffName('');
    setNewStaffPin('');
    setNewStaffRole('Chef');
    setNewStaffImmediateAccess(true);
  };

  // --- PIN Keyboard Authentication Engine ---
  const handlePinKeyPress = (key: string) => {
    playBeep(700, 0.04);
    if (key === 'CLEAR') {
      setPinInput('');
    } else if (key === 'BACK') {
      setPinInput(prev => prev.slice(0, -1));
    } else {
      if (pinInput.length < 4) {
        const nextPin = pinInput + key;
        setPinInput(nextPin);

        // Auto-submit when length reaches 4
        if (nextPin.length === 4) {
          // Find matching active staff member
          const matched = staffMembers.find(s => s.pin === nextPin && s.status === 'Active');
          
          // Pre-configured global short-codes also allowed for convenience:
          // Owner: 9999, Chef: 2222, Waiter: 3333
          let bypassRole: 'Owner' | 'Chef' | 'Waiter' | null = null;
          if (nextPin === '9999') bypassRole = 'Owner';
          if (nextPin === '2222' || nextPin === '8829') bypassRole = 'Chef';
          if (nextPin === '3333' || nextPin === '1044') bypassRole = 'Waiter';

          setTimeout(() => {
            if (matched || bypassRole) {
              playChime(true);
              const userObj = matched || {
                id: 'bypass',
                name: bypassRole === 'Owner' ? 'Admin Executive' : bypassRole === 'Chef' ? 'Chef de Cuisine' : 'Service Lead',
                role: bypassRole || 'Waiter',
                pin: nextPin,
                status: 'Active' as const,
                joined: 'System',
                authorized: true
              };
              setCurrentUser(userObj);
              setPerspective('staff-portal');
              
              // Direct tab mapping depending on staff role:
              if (userObj.role === 'Chef') {
                setActiveTab('kitchen');
              } else if (userObj.role === 'Waiter') {
                setActiveTab('live-orders');
              } else {
                setActiveTab('staff');
              }
              setPinInput('');
            } else {
              playChime(false);
              setPinInput('');
              alert('Invalid Security Credentials. Please try again.');
            }
          }, 150);
        }
      }
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput && passwordInput) {
      playChime(true);
      setCurrentUser({
        id: 'email-user',
        name: emailInput.split('@')[0].toUpperCase(),
        role: 'Owner',
        pin: '9999',
        status: 'Active',
        joined: 'Just now',
        authorized: true
      });
      setPerspective('staff-portal');
      setActiveTab('staff');
    } else {
      playChime(false);
      alert('Please fill out both email and password.');
    }
  };

  // --- Guest Menu Ordering Flow ---
  const handleAddCart = (itemId: string) => {
    playBeep(850, 0.05);
    setGuestCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const handleRemoveCart = (itemId: string) => {
    playBeep(650, 0.05);
    setGuestCart(prev => {
      const val = prev[itemId] || 0;
      if (val <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: val - 1
      };
    });
  };

  const guestCartTotal = useMemo(() => {
    return Object.entries(guestCart).reduce((acc, [id, qty]) => {
      const item = MENU_ITEMS.find(m => m.id === id);
      const q = qty as number;
      return acc + (item ? item.price * q : 0);
    }, 0);
  }, [guestCart]);

  const handlePlaceOrder = () => {
    if (!guestName.trim()) {
      playChime(false);
      alert('Please enter your name in the cart area to place your order!');
      return;
    }

    if (Object.keys(guestCart).length === 0) {
      playChime(false);
      alert('Your cart is empty. Tap any items to add!');
      return;
    }

    const orderItems: OrderItem[] = Object.entries(guestCart).map(([id, qty]) => {
      const item = MENU_ITEMS.find(m => m.id === id)!;
      return {
        name: item.name,
        qty: qty as number,
        price: item.price
      };
    });

    // Generate custom 8-character premium hex ID like the image: #83788D6F
    const uniqueId = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');

    const newOrder: Order = {
      id: uniqueId,
      table: selectedTableForGuest,
      items: orderItems,
      status: 'received',
      total: guestCartTotal,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      notes: guestNotes,
      customerName: guestName.trim()
    };

    setOrders(prev => [...prev, newOrder]);
    playChime(true);
    
    // Save to tracking state & localStorage
    localStorage.setItem('quorum_active_order_id', uniqueId);
    localStorage.setItem('quorum_guest_name', guestName.trim());
    setActiveTrackingOrderId(uniqueId);
    
    // Reset guest cart
    setGuestCart({});
    setGuestNotes('');
    setPerspective('order-tracking');
  };

  // --- Waiter Manual Orders from Sidebar ---
  const handleManualOrderAdd = (itemId: string) => {
    playBeep(850, 0.05);
    setManualOrderCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const handleManualOrderRemove = (itemId: string) => {
    playBeep(650, 0.05);
    setManualOrderCart(prev => {
      const val = prev[itemId] || 0;
      if (val <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: val - 1
      };
    });
  };

  const manualOrderTotal = useMemo(() => {
    return Object.entries(manualOrderCart).reduce((acc, [id, qty]) => {
      const item = MENU_ITEMS.find(m => m.id === id);
      const q = qty as number;
      return acc + (item ? item.price * q : 0);
    }, 0);
  }, [manualOrderCart]);

  const handleManualOrderSubmit = () => {
    if (Object.keys(manualOrderCart).length === 0) {
      playChime(false);
      return;
    }
    const orderItems: OrderItem[] = Object.entries(manualOrderCart).map(([id, qty]) => {
      const item = MENU_ITEMS.find(m => m.id === id)!;
      return {
        name: item.name,
        qty: qty as number,
        price: item.price
      };
    });

    const newOrder: Order = {
      id: Math.floor(1000 + Math.random() * 9000).toString(),
      table: manualOrderTable,
      items: orderItems,
      status: 'preparing',
      total: manualOrderTotal,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setOrders(prev => [...prev, newOrder]);
    setIsNewManualOrderOpen(false);
    setManualOrderCart({});
    playChime(true);
  };

  // --- Live Workflow Interactions ---
  const handleStartPreparing = (orderId: string) => {
    playBeep(750, 0.05);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o));
  };

  const handleMarkReady = (orderId: string) => {
    playChime(true);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready' } : o));

    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      const newNotif: PaymentNotification = {
        id: 'kds-' + Date.now() + '-' + Math.random().toString(),
        orderId: targetOrder.id,
        table: targetOrder.table,
        timestamp: 'Just now',
        type: 'kitchen-ready',
        message: `Notification for Waiter: Order #${targetOrder.id} is Ready! Please take the meal from the kitchen.`
      };
      setNotifications(prev => [newNotif, ...prev]);
    }
  };

  const handleMarkServed = (orderId: string) => {
    playChime(true);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'served' } : o));
  };

  const handleVerifyPayment = (orderId: string) => {
    playBeep(1200, 0.08);
    setTimeout(() => playBeep(1600, 0.12), 80);

    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'paid' } : o));

    // Inject immediate live floating notification/toast
    const newNotif: PaymentNotification = {
      id: 'n' + (notifications.length + 1) + Math.random().toString(),
      orderId: targetOrder.id,
      amount: targetOrder.total,
      table: targetOrder.table,
      timestamp: 'Just verified'
    };

    setNotifications(prev => [newNotif, ...prev]);
  };

  // Filtered list of personnel based on directory search bar
  const filteredStaff = useMemo(() => {
    return staffMembers.filter(member => {
      const q = searchQuery.toLowerCase();
      return member.name.toLowerCase().includes(q) || member.role.toLowerCase().includes(q) || member.pin.includes(q);
    });
  }, [staffMembers, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e2e2e2] flex flex-col font-sans transition-colors duration-300">
      
      {/* Floater Toast Stack - Real-time verified payments & kitchen readiness notifications */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
        {notifications.map(notif => (
          <NotificationToast
            key={notif.id}
            notif={notif}
            onDismiss={handleDismissNotification}
          />
        ))}
      </div>

      {/* =========================================
          PERSPECTIVE 1: BRAND LANDING PAGE (MOCK #1)
          ========================================= */}
      {perspective === 'landing' && (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-black selection:bg-primary selection:text-white">
          
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Top Menu bar */}
          <header className="border-b border-zinc-900 bg-black/90 sticky top-0 z-40 backdrop-blur">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-black text-xl tracking-tighter">
                  Q
                </div>
                <span className="font-display font-bold text-lg tracking-widest text-white">QUORUM</span>
              </div>

              {/* Mockup Navigation headers */}
              <nav className="hidden md:flex items-center gap-8">
                <span className="text-xs font-bold tracking-widest text-primary border-b-2 border-primary pb-1 cursor-pointer">KDS</span>
                <span className="text-xs font-bold tracking-widest text-neutral-400 hover:text-white transition-colors cursor-pointer" onClick={() => { playBeep(800, 0.05); setPerspective('pin-login'); }}>Floor</span>
                <span className="text-xs font-bold tracking-widest text-neutral-400 hover:text-white transition-colors cursor-pointer" onClick={() => { playBeep(800, 0.05); setPerspective('guest-menu'); }}>Inventory</span>
                <span className="text-xs font-bold tracking-widest text-neutral-400 hover:text-white transition-colors cursor-pointer" onClick={() => { playBeep(800, 0.05); setPerspective('pin-login'); }}>Insights</span>
              </nav>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => { playBeep(800, 0.05); setPerspective('pin-login'); }}
                  className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-lg text-xs font-bold tracking-wider transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Staff Console
                </button>
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Bell className="w-4 h-4 hover:text-white transition-colors cursor-pointer" />
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  <Sliders className="w-4 h-4 ml-2 hover:text-white transition-colors cursor-pointer" />
                </div>
              </div>
            </div>
          </header>

          {/* Hero Segment */}
          <div className="flex-1 max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Brand Intro */}
            <div className="lg:col-span-6 space-y-8">
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-neutral-500 uppercase">
                <span>QR Ordering</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                <span>Kitchen Ops</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                <span className="text-primary">Payment Verify</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]">
                Every plate,<br />
                <span className="text-primary italic font-display font-light">in the right hands.</span>
              </h1>

              <p className="text-lg text-neutral-400 font-normal leading-relaxed max-w-lg">
                One system that runs the floor: guests order by QR, chefs work a
                live queue, waiters confirm payment — the owner sees it all in real-time.
              </p>

               {/* Launch Interaction Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  id="btn-scan-qr"
                  onClick={() => { playBeep(800, 0.05); setIsQrScannerOpen(true); }}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-primary hover:bg-primary/95 text-black rounded-xl text-base font-extrabold transition-all hover:scale-[1.02] cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Camera className="w-5 h-5 stroke-[2.5]" /> Scan Table QR Code
                </button>

                <button
                  id="btn-guest-menu"
                  onClick={() => { playChime(true); setPerspective('guest-menu'); }}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-950 hover:bg-zinc-900 border border-[#352622] text-[#ffb5a0] rounded-xl text-base font-bold transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <QrCode className="w-5 h-5 text-primary" /> Try the menu (Table 1)
                </button>

                <button
                  id="btn-staff-console"
                  onClick={() => { playBeep(800, 0.05); setPerspective('pin-login'); }}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-base font-bold transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Terminal className="w-5 h-5" /> Open staff console
                </button>
              </div>

              {/* Bottom statistics row */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-center sm:text-left">
                  <p className="font-display font-bold text-4xl text-[#ffb5a0]">3</p>
                  <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase mt-1">ROLES</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-center sm:text-left">
                  <p className="font-display font-bold text-4xl text-white">6</p>
                  <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase mt-1">TABLES</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 text-center sm:text-left">
                  <p className="font-display font-bold text-4xl text-white">4s</p>
                  <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase mt-1">LIVE SYNC</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Floor Visualization */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                {/* Background Restaurant Image */}
                <img
                  src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200"
                  alt="Modern Restaurant Dining"
                  className="w-full aspect-[4/3] object-cover filter brightness-75 contrast-105"
                />

                {/* Status Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />

                {/* Floating pill in the bottom-left of the image */}
                <div className="absolute bottom-6 left-6 right-6 md:right-auto bg-black/85 backdrop-blur border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                      <ChefHat className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Table 4 <span className="text-neutral-500 font-normal">• 2 orders</span></h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Ready in 6 min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                  </div>
                </div>

                {/* Table Live Status Badges */}
                <div className="absolute top-6 left-6 bg-zinc-950/90 backdrop-blur border border-zinc-800 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Floor Queue
                </div>
              </div>
            </div>

          </div>

          {/* Minimalist Landing Footer */}
          <footer className="border-t border-zinc-900 bg-black/60 py-6 text-center text-xs text-neutral-600">
            <p>© {new Date().getFullYear()} Quorum Hospitality Networks Inc. High-velocity terminal solutions.</p>
          </footer>
        </div>
      )}

      {/* =========================================
          PERSPECTIVE 2: STAFF PIN LOGIN TERMINAL (MOCK #2)
          ========================================= */}
      {perspective === 'pin-login' && (
        <div className="flex-1 flex flex-col justify-between bg-black relative p-6 select-none">
          
          {/* Top Logo Header */}
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between pt-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { playBeep(600, 0.05); setPerspective('landing'); }}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-black text-base tracking-tighter">
                Q
              </div>
              <span className="font-display font-bold text-sm tracking-widest text-white">QUORUM</span>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-2">· STAFF</span>
            </div>

            <button
              onClick={() => { playBeep(600, 0.05); setPerspective('landing'); }}
              className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to main screen
            </button>
          </div>

          {/* Central PIN interface Grid */}
          <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center py-8">
            
            {/* Left Console Description */}
            <div className="md:col-span-5 space-y-6 text-left">
              <span className="text-xs font-bold tracking-widest text-primary uppercase">OPERATIONS CONSOLE</span>
              <h2 className="text-5xl font-bold text-white tracking-tight leading-none">
                Fast in.<br />
                <span className="text-primary">Faster out.</span>
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                PIN in on the tablet or use your email from any device. Access your station instantly.
              </p>
              <div className="flex items-center gap-3 pt-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">
                <span>OWNER</span>
                <span className="text-neutral-700">•</span>
                <span>CHEF</span>
                <span className="text-neutral-700">•</span>
                <span>WAITER</span>
              </div>
            </div>

            {/* Right Card PIN Pad widget */}
            <div className="md:col-span-7 flex justify-center">
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                
                {/* Switch between PIN & Email modes */}
                <div className="flex bg-neutral-900 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => { playBeep(750, 0.05); setLoginMethod('PIN'); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-bold transition-all ${
                      loginMethod === 'PIN'
                        ? 'bg-primary text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" /> PIN Code
                  </button>
                  <button
                    onClick={() => { playBeep(750, 0.05); setLoginMethod('Email'); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-lg text-xs font-bold transition-all ${
                      loginMethod === 'Email'
                        ? 'bg-primary text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email Auth
                  </button>
                </div>

                {/* Mode content: PIN Grid */}
                {loginMethod === 'PIN' ? (
                  <div className="mt-8 space-y-6 text-center">
                    <div>
                      <h3 className="font-bold text-sm text-white">Enter your PIN</h3>
                      <p className="text-xs text-neutral-500 mt-1">Tap in your 4-digit code.</p>
                    </div>

                    {/* Code Dots */}
                    <div className="flex justify-center gap-4 py-4">
                      {[0, 1, 2, 3].map(idx => (
                        <div
                          key={idx}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${
                            pinInput.length > idx
                              ? 'border-primary bg-primary/10 text-white font-bold text-xl'
                              : 'border-zinc-800 bg-neutral-900/60'
                          }`}
                        >
                          {pinInput.length > idx ? (
                            <span className="w-3 h-3 rounded-full bg-primary" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Numeric PIN Pad Layout */}
                    <div className="grid grid-cols-3 gap-3">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                        <button
                          key={num}
                          onClick={() => handlePinKeyPress(num)}
                          className="py-5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-900 hover:border-zinc-800 text-white font-semibold text-lg rounded-xl active:scale-95 transition-all cursor-pointer"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        onClick={() => handlePinKeyPress('CLEAR')}
                        className="py-5 bg-zinc-900/30 hover:bg-zinc-900/50 text-neutral-400 font-bold text-xs rounded-xl uppercase active:scale-95 transition-all cursor-pointer"
                      >
                        CLEAR
                      </button>
                      <button
                        onClick={() => handlePinKeyPress('0')}
                        className="py-5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-900 text-white font-semibold text-lg rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        0
                      </button>
                      <button
                        onClick={() => handlePinKeyPress('BACK')}
                        className="py-5 bg-zinc-900/30 hover:bg-zinc-900/50 text-neutral-400 flex items-center justify-center rounded-xl active:scale-95 transition-all cursor-pointer"
                      >
                        <X className="w-5 h-5 text-[#ffb5a0]" />
                      </button>
                    </div>

                    {/* PIN Codes cheat sheet */}
                    <p className="text-[10px] font-mono tracking-wider text-neutral-600 uppercase pt-2 select-text">
                      DEMO PINs: OWNER 9999 · CHEF 2222 · WAITER 3333
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="mt-8 space-y-5 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Email Address</label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        placeholder="e.g. manager@quorumops.com"
                        className="w-full bg-neutral-900 border border-zinc-850 p-3.5 rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Security Password</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-neutral-900 border border-zinc-850 p-3.5 rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-2 py-4 bg-primary text-black font-bold text-sm rounded-lg hover:bg-primary/90 transition-all cursor-pointer"
                    >
                      Authorize Terminal
                    </button>
                  </form>
                )}

              </div>
            </div>

          </div>

          {/* Bottom Lock Info */}
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between border-t border-zinc-900 pt-6 text-[10px] font-mono tracking-widest text-neutral-500">
            <span>SYSTEM VERSION 4.2.1-STABLE</span>
            <span className="flex items-center gap-1.5 mt-2 sm:mt-0">
              <Lock className="w-3.5 h-3.5 text-success" /> ENCRYPTED OPS CONNECTION
            </span>
          </div>

        </div>
      )}

      {/* =========================================
          PERSPECTIVE 3: STAFF CORE OPERATIONS (MOCK #3)
          ========================================= */}
      {perspective === 'staff-portal' && (
        <div className="flex-1 flex h-screen overflow-hidden bg-black select-none">
          
          {/* Left Navigation Sidebar */}
          <aside className="hidden md:flex flex-col h-full py-6 px-4 bg-zinc-950 border-r border-zinc-900 w-64 shrink-0 justify-between">
            <div className="space-y-8">
              {/* Sidebar Header */}
              <div className="px-2 cursor-pointer" onClick={() => { playBeep(600, 0.05); setPerspective('landing'); }}>
                <h1 className="font-display font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
                  <span className="text-primary">Quorum</span> Ops
                </h1>
                <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase mt-1">Main Dining Hall</p>
              </div>

              {/* Navigation Actions list */}
              <nav className="space-y-1.5">
                <button
                  onClick={() => { playBeep(700, 0.04); setActiveTab('overview'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'overview'
                      ? 'bg-primary text-black font-extrabold'
                      : 'text-neutral-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Overview
                </button>

                <button
                  onClick={() => { playBeep(700, 0.04); setActiveTab('live-orders'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'live-orders'
                      ? 'bg-primary text-black font-extrabold'
                      : 'text-neutral-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Receipt className="w-4 h-4" /> Live Orders
                  <span className="ml-auto w-5 h-5 rounded-full bg-zinc-900 text-[#ffb5a0] flex items-center justify-center text-[10px] font-mono border border-zinc-800">
                    {orders.filter(o => o.status !== 'paid').length}
                  </span>
                </button>

                <button
                  onClick={() => { playBeep(700, 0.04); setActiveTab('kitchen'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'kitchen'
                      ? 'bg-primary text-black font-extrabold'
                      : 'text-neutral-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <ChefHat className="w-4 h-4" /> Kitchen (KDS)
                  <span className="ml-auto w-5 h-5 rounded-full bg-zinc-900 text-[#ffb5a0] flex items-center justify-center text-[10px] font-mono border border-zinc-800">
                    {orders.filter(o => o.status === 'preparing').length}
                  </span>
                </button>

                {currentUser?.role === 'Owner' && (
                  <button
                    onClick={() => { playBeep(700, 0.04); setActiveTab('staff'); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === 'staff'
                        ? 'bg-primary text-black font-extrabold'
                        : 'text-neutral-400 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Staff Panel
                  </button>
                )}

                <button
                  onClick={() => { playBeep(700, 0.04); setActiveTab('qr-station'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'qr-station'
                      ? 'bg-primary text-black font-extrabold'
                      : 'text-neutral-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" /> Table QRs
                </button>

                <button
                  onClick={() => { playBeep(700, 0.04); setActiveTab('settings'); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === 'settings'
                      ? 'bg-primary text-black font-extrabold'
                      : 'text-neutral-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" /> Settings
                </button>
              </nav>
            </div>

            {/* Bottom Panel Actions */}
            <div className="space-y-4">
              {(currentUser?.role === 'Waiter' || currentUser?.role === 'Owner') && (
                <button
                  onClick={() => { playBeep(800, 0.05); setIsNewManualOrderOpen(true); }}
                  className="w-full py-4 bg-primary text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> New Order
                </button>
              )}

              <div className="border-t border-zinc-900 pt-4 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 text-xs text-neutral-500 font-mono">
                  <span className="w-2 h-2 rounded-full bg-success" /> {currentUser?.name} ({currentUser?.role})
                </div>
                <button
                  onClick={() => { playBeep(500, 0.08); setCurrentUser(null); setPerspective('landing'); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold text-neutral-400 hover:bg-zinc-900 hover:text-white transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Staff Logout
                </button>
              </div>
            </div>
          </aside>

          {/* Main Workspace Frame */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#0e0e0e] overflow-hidden relative">
            
            {/* Top Workspace Bar */}
            <header className="flex justify-between items-center px-6 py-4 bg-zinc-950 border-b border-zinc-900 shrink-0 z-10">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { playBeep(600, 0.05); setPerspective('landing'); }}
                  className="p-2 hover:bg-zinc-900 rounded-full text-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {activeTab === 'staff' && 'Staff Management'}
                  {activeTab === 'overview' && 'Restaurant Overview & Floor'}
                  {activeTab === 'live-orders' && 'Live Orders Dashboard'}
                  {activeTab === 'kitchen' && 'Kitchen Display System (KDS)'}
                  {activeTab === 'settings' && 'System Preferences'}
                  {activeTab === 'qr-station' && 'Table QR Code Station'}
                </h2>
              </div>

              {/* Action utilities */}
              <div className="flex items-center gap-4">
                {activeTab === 'staff' && (
                  <button
                    onClick={() => { playBeep(750, 0.05); setIsAddStaffOpen(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Staff Member
                  </button>
                )}

                <div className="flex items-center gap-2 text-neutral-500 border-l border-zinc-900 pl-4">
                  <span className="p-2 hover:text-white transition-colors cursor-pointer relative">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
                  </span>
                  <span className="p-2 hover:text-white transition-colors cursor-pointer">
                    <Settings className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </header>

            {/* Dashboard Content Scroller */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* =========================================
                  TAB 1: STAFF DIRECTORY (MATCHES MOCK #3)
                  ========================================= */}
              {activeTab === 'staff' && (
                currentUser?.role === 'Owner' ? (
                  <>
                    {/* Owner's Exclusive Executive Command Header */}
                    <div id="owner-executive-banner" className="bg-zinc-950 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="space-y-1.5 relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-[10px] font-bold tracking-widest text-primary uppercase font-mono">AUTHORIZED EXECUTIVE ENVIRONMENT</span>
                        </div>
                        <h3 className="font-display font-extrabold text-2xl text-white tracking-tight">Owner's Executive Command Headquarters</h3>
                        <p className="text-xs text-neutral-400 max-w-2xl">
                          Secure system status. You have exclusive Owner level authorization to configure security codes, toggle terminal access keys, and admit new staff members ("loginer") to Quorum floor stations.
                        </p>
                      </div>
                      <div className="bg-primary/10 border border-primary/30 text-primary rounded-xl px-4 py-2.5 text-xs font-bold font-mono tracking-wider shrink-0 z-10">
                        LEVEL 5 OWNER ENVELOPE
                      </div>
                    </div>

                    {/* Statistics metrics boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900">
                        <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Active Now</span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold font-display text-primary">{metrics.activeNow}</span>
                          <span className="text-xs text-success font-bold">+2 from yesterday</span>
                        </div>
                      </div>

                      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900">
                        <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Total Staff</span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold font-display text-white">{metrics.totalStaff}</span>
                        </div>
                      </div>

                      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900">
                        <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Waitlist Ops</span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold font-display text-white">8</span>
                          <span className="text-xs text-neutral-500 font-semibold">Full Team</span>
                        </div>
                      </div>

                      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900">
                        <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Kitchen Efficiency</span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold font-display text-success">{metrics.efficiency}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Personnel directory panel */}
                    <div className="bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden">
                      
                      {/* Panel search header */}
                      <div className="px-6 py-4 border-b border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950">
                        <h3 className="font-display font-bold text-lg text-white">Personnel Directory</h3>
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search name or ID..."
                            className="w-full bg-neutral-900/60 border border-zinc-850 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* Desktop Responsive Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase border-b border-zinc-900">
                              <th className="px-6 py-4">Member</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4">PIN / ID</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Authorize</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {filteredStaff.map(member => (
                              <tr
                                key={member.id}
                                className={`hover:bg-zinc-900/30 transition-colors ${
                                  member.status === 'Deactivated' ? 'opacity-40' : ''
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                      member.role === 'Chef'
                                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                        : member.role === 'Waiter'
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'bg-primary/10 text-primary border border-primary/20'
                                    }`}>
                                      {member.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                      <div className="font-bold text-white text-sm">{member.name}</div>
                                      <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">Joined {member.joined}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    member.role === 'Chef'
                                      ? 'bg-orange-950/40 text-orange-400'
                                      : member.role === 'Waiter'
                                      ? 'bg-blue-950/40 text-blue-400'
                                      : 'bg-primary/10 text-primary'
                                  }`}>
                                    {member.role}
                                  </span>
                                </td>

                                <td className="px-6 py-4 font-mono text-sm text-primary tracking-widest font-semibold">
                                  {member.pin}
                                </td>

                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'Active' ? 'bg-success' : 'bg-danger'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${member.status === 'Active' ? 'text-success' : 'text-danger'}`}>
                                      {member.status}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={member.authorized}
                                      onChange={() => handleToggleAuthorization(member.id)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary" />
                                  </label>
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <button className="p-2 text-neutral-500 hover:text-primary transition-colors cursor-pointer">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredStaff.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 text-sm">
                                  No staff members match your filter criteria.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  </>
                ) : (
                  <div className="bg-zinc-950 rounded-2xl border border-red-500/10 p-12 text-center max-w-lg mx-auto space-y-6">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
                      <Lock className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white">Owner Privilege Required</h3>
                      <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                        You are authenticated under the <span className="font-bold text-white">"{currentUser?.role}"</span> operational profile. The Personnel Directory and New User Admission Console are restricted exclusively to the Owner.
                      </p>
                    </div>
                    <p className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase pt-2">
                      SECURITY ACCESS KEY REQUIRED • CLEAR CLEAR
                    </p>
                  </div>
                )
              )}

              {/* =========================================
                  TAB 2: RESTAURANT OVERVIEW & FLOOR PLAN
                  ========================================= */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Visual Floor Guide Panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Live Floor Map */}
                    <div className="lg:col-span-8 bg-zinc-950 rounded-xl border border-zinc-900 p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-display font-bold text-lg text-white font-sans">Active Dining Tables</h3>
                          <p className="text-xs text-neutral-500 mt-1">Real-time occupancy and catering status.</p>
                        </div>
                        <div className="flex gap-4 text-xs font-bold tracking-wide uppercase">
                          <span className="flex items-center gap-1.5 text-neutral-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" /> Available
                          </span>
                          <span className="flex items-center gap-1.5 text-orange-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Preparing
                          </span>
                          <span className="flex items-center gap-1.5 text-success">
                            <span className="w-2.5 h-2.5 rounded-full bg-success" /> Food Ready
                          </span>
                        </div>
                      </div>

                      {/* Room Layout Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 py-6">
                        {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map(tNum => {
                          const tableOrders = orders.filter(o => o.table === tNum && o.status !== 'paid');
                          const activeOrder = tableOrders[0];
                          
                          let statusBg = 'border-zinc-800 bg-zinc-900 hover:bg-zinc-850';
                          let statusText = 'text-neutral-500';
                          let pillText = 'Empty';

                          if (activeOrder) {
                            if (activeOrder.status === 'preparing') {
                              statusBg = 'border-orange-950/40 bg-orange-950/10 hover:bg-orange-950/20';
                              statusText = 'text-orange-400';
                              pillText = 'Preparing';
                            } else if (activeOrder.status === 'ready') {
                              statusBg = 'border-success/30 bg-success/5 hover:bg-success/10 animate-pulse';
                              statusText = 'text-success';
                              pillText = 'Serve Now';
                            }
                          }

                          return (
                            <div
                              key={tNum}
                              className={`rounded-2xl border p-6 flex flex-col items-center justify-between gap-4 text-center transition-all ${statusBg}`}
                            >
                              <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center font-bold text-white text-sm bg-black shadow">
                                {tNum.split(' ')[1]}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{tNum}</h4>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${statusText}`}>
                                  {pillText}
                                </p>
                              </div>
                              {activeOrder ? (
                                <div className="text-[11px] text-neutral-400 border-t border-zinc-900/60 pt-3 w-full">
                                  <div className="font-mono font-bold">₹{activeOrder.total.toFixed(2)}</div>
                                  <div className="text-[9px] text-neutral-500 mt-0.5">{activeOrder.items.length} items</div>
                                </div>
                              ) : (
                                (currentUser?.role === 'Waiter' || currentUser?.role === 'Owner') ? (
                                  <button
                                    onClick={() => {
                                      playBeep(850, 0.05);
                                      setManualOrderTable(tNum);
                                      setIsNewManualOrderOpen(true);
                                    }}
                                    className="text-[10px] font-bold text-primary hover:underline transition-all"
                                  >
                                    + Order
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-zinc-600 font-semibold uppercase">Available</span>
                                )
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>

                    {/* Quick Live Simulation Controls */}
                    <div className="lg:col-span-4 bg-zinc-950 rounded-xl border border-zinc-900 p-6 space-y-6">
                      <div>
                        <h3 className="font-display font-bold text-lg text-white">Live Simulator</h3>
                        <p className="text-xs text-neutral-500 mt-1">Accelerate orders to demonstrate reactive views.</p>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="p-4 bg-neutral-900 rounded-xl border border-zinc-850 space-y-3">
                          <h4 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Simulate Customer Order</h4>
                          <p className="text-xs text-neutral-500">Pushes a new customer order into the kitchen instantly.</p>
                          <button
                            onClick={() => {
                              playChime(true);
                              const randId = Math.floor(1000 + Math.random() * 9000).toString();
                              const newSim: Order = {
                                id: randId,
                                table: 'Table ' + Math.floor(1 + Math.random() * 6),
                                items: [
                                  { name: 'Signature Wagyu Burger', qty: 1, price: 650.00 },
                                  { name: 'Truffle Parmesan Fries', qty: 2, price: 299.00 }
                                ],
                                status: 'preparing',
                                total: 1248.00,
                                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                              };
                              setOrders(prev => [...prev, newSim]);
                            }}
                            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-xs rounded-lg transition-colors border border-zinc-700 cursor-pointer"
                          >
                            Place Order
                          </button>
                        </div>

                        <div className="p-4 bg-neutral-900 rounded-xl border border-zinc-850 space-y-3">
                          <h4 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Speed up Chefs</h4>
                          <p className="text-xs text-neutral-500 font-sans">Marks the oldest cooking ticket as ready to serve.</p>
                          <button
                            onClick={() => {
                              const pending = orders.find(o => o.status === 'preparing');
                              if (pending) {
                                handleMarkReady(pending.id);
                              } else {
                                alert('All orders are already cooked!');
                              }
                            }}
                            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-xs rounded-lg transition-colors border border-zinc-700 cursor-pointer"
                          >
                            Mark Oldest Cooked
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* =========================================
                  TAB 3: LIVE ORDERS LIST (WAITER)
                  ========================================= */}
              {activeTab === 'live-orders' && (
                <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-6 space-y-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">Active Order Registry</h3>
                    <p className="text-xs text-neutral-500 mt-1">Pending floor transactions requiring waiter clearance.</p>
                  </div>

                  <div className="space-y-4">
                    {orders.filter(o => o.status !== 'paid').map(order => (
                      <div
                        key={order.id}
                        className="bg-neutral-900/60 rounded-xl border border-zinc-850 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-primary font-bold">#{order.id}</span>
                            <span className="text-xs text-neutral-500 font-semibold">{order.time}</span>
                            <span className="text-xs font-bold text-neutral-300 px-2 py-0.5 bg-zinc-800 rounded">
                              {order.table} {order.customerName ? `· ${order.customerName}` : ''}
                            </span>
                          </div>
                          
                          <div className="text-sm text-neutral-300 pt-1">
                            {order.items.map((it, idx) => (
                              <span key={idx} className="after:content-['•'] after:mx-2 after:text-neutral-700 last:after:content-none font-sans">
                                {it.qty}x {it.name}
                              </span>
                            ))}
                          </div>

                          {order.notes && (
                            <p className="text-xs text-orange-400 italic">
                              Note: {order.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-zinc-800/50 md:border-t-0 pt-3 md:pt-0">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Subtotal</p>
                            <p className="font-mono font-bold text-white text-base">₹{order.total.toFixed(2)}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            {order.status === 'received' && (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded bg-blue-950/40 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-900/30">
                                  Received
                                </span>
                                <button
                                  onClick={() => handleStartPreparing(order.id)}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-[10px] rounded uppercase tracking-wider border border-zinc-700 cursor-pointer"
                                >
                                  Kitchen Prep
                                </button>
                              </div>
                            )}

                            {order.status === 'preparing' && (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded bg-orange-950/40 text-orange-400 text-[10px] font-bold uppercase tracking-wider border border-orange-900/30 animate-pulse">
                                  Cooking
                                </span>
                                <button
                                  onClick={() => handleMarkReady(order.id)}
                                  className="px-3 py-1.5 bg-primary text-black font-bold text-[10px] rounded uppercase tracking-wider cursor-pointer"
                                >
                                  Finish Cook
                                </button>
                              </div>
                            )}

                            {order.status === 'ready' && (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded bg-green-950/40 text-green-400 text-[10px] font-bold uppercase tracking-wider border border-green-900/30">
                                  Meal Cooked
                                </span>
                                <button
                                  onClick={() => handleMarkServed(order.id)}
                                  className="px-3 py-1.5 bg-emerald-500 text-black font-extrabold text-[10px] rounded uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  Deliver to Table
                                </button>
                              </div>
                            )}

                            {order.status === 'served' && (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded bg-zinc-850 text-zinc-300 text-[10px] font-bold uppercase tracking-wider border border-zinc-800">
                                  Served
                                </span>
                                <button
                                  onClick={() => handleVerifyPayment(order.id)}
                                  className="px-3 py-1.5 bg-success text-black font-bold text-[10px] rounded uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  Collect Payout
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}

                    {orders.filter(o => o.status !== 'paid').length === 0 && (
                      <div className="text-center py-12 text-neutral-500 text-sm">
                        All clear! No pending orders.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================
                  TAB 4: KITCHEN DISPLAY TICKETS (KDS)
                  ========================================= */}
              {activeTab === 'kitchen' && (
                <div className="space-y-6">
                  
                  {/* Grid of cooking tickets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {orders.filter(o => o.status === 'received' || o.status === 'preparing').map(order => (
                      <div
                        key={order.id}
                        className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex flex-col justify-between"
                      >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
                          <div>
                            <span className="font-mono text-[#ffb5a0] font-bold text-sm">#{order.id}</span>
                            <span className="ml-2 font-display text-sm font-bold text-white uppercase">{order.table}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {order.status === 'received' ? (
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-950 text-blue-400 border border-blue-850 rounded uppercase tracking-wider">
                                New
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-950 text-amber-400 border border-amber-850 rounded uppercase tracking-wider animate-pulse">
                                Cooking
                              </span>
                            )}
                            <span className="text-xs text-neutral-500 font-mono flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-primary" /> {order.time}
                            </span>
                          </div>
                        </div>

                        {/* Order Checklist Body */}
                        <div className="px-5 py-5 flex-1 space-y-4">
                          {order.customerName && (
                            <div className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                              Guest: <span className="text-white">{order.customerName}</span>
                            </div>
                          )}

                          <div className="divide-y divide-zinc-900">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="py-2.5 flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="w-4.5 h-4.5 rounded text-primary bg-zinc-900 border-zinc-800 focus:ring-0 mt-0.5"
                                  onClick={() => playBeep(900, 0.04)}
                                />
                                <div>
                                  <p className="font-bold text-sm text-white">{it.qty}x {it.name}</p>
                                  <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Ingredients prepped</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="p-3 bg-orange-950/10 border border-orange-500/20 text-orange-400 rounded-lg text-xs">
                              <span className="font-bold">Instructions:</span> {order.notes}
                            </div>
                          )}
                        </div>

                        {/* Footer button */}
                        <div className="px-5 py-4 border-t border-zinc-900/60">
                          {order.status === 'received' ? (
                            <button
                              onClick={() => handleStartPreparing(order.id)}
                              className="w-full py-3 bg-zinc-850 text-white border border-zinc-700 hover:bg-zinc-800 font-bold text-xs rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Start Preparing
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkReady(order.id)}
                              className="w-full py-3 bg-primary text-black font-bold text-xs rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              Mark Order Ready
                            </button>
                          )}
                        </div>

                      </div>
                    ))}

                    {orders.filter(o => o.status === 'received' || o.status === 'preparing').length === 0 && (
                      <div className="col-span-full text-center py-24 bg-zinc-950 border border-zinc-900 rounded-xl text-neutral-500 text-sm">
                        No active kitchen tickets. The queue is fully cleared!
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* =========================================
                  TAB 6: TABLE QR CODE STATION & CUSTOMIZER
                  ========================================= */}
              {activeTab === 'qr-station' && (() => {
                return (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="bg-zinc-950 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="space-y-1.5 relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-[10px] font-bold tracking-widest text-primary uppercase font-mono">STATIONERY & QR DEPLOYER</span>
                        </div>
                        <h3 className="font-display font-extrabold text-2xl text-white tracking-tight">Table QR Code Customization & Print Station</h3>
                        <p className="text-xs text-neutral-400 max-w-2xl">
                          Generate, design, and print table-specific QR Code labels. When customers scan these labels with their personal smartphones, they are automatically placed at their selected dining table to browse, order, and track their hot-pot, wagyu steaks, and cocktails.
                        </p>
                      </div>
                      <div className="bg-primary/10 border border-primary/30 text-primary rounded-xl px-4 py-2.5 text-xs font-bold font-mono tracking-wider shrink-0 z-10 font-sans">
                        OFFLINE PRINT READY
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left: Designer Parameters */}
                      <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-6 text-left">
                        <h3 className="text-sm font-extrabold tracking-widest text-neutral-400 uppercase font-mono border-b border-zinc-900 pb-3">
                          1. STYLING PARAMETERS
                        </h3>

                        {/* Select/Input Table */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Target Dining Table</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { playBeep(800, 0.04); setQrSelectedTable(t); }}
                                className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                  qrSelectedTable === t
                                    ? 'bg-[#d45129]/20 border-[#d45129] text-white'
                                    : 'bg-zinc-900 border-zinc-800 text-neutral-400 hover:text-white'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <div className="pt-2">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Or Custom Table Name</label>
                            <input
                              type="text"
                              value={qrSelectedTable}
                              onChange={e => setQrSelectedTable(e.target.value)}
                              placeholder="e.g. VIP Booth B, Bar Seat 4"
                              className="w-full bg-neutral-900 border border-zinc-850 p-2.5 rounded-lg text-xs text-white focus:outline-none focus:border-primary mt-1 font-semibold"
                            />
                          </div>
                        </div>

                        {/* Theme Customizer Color Picker */}
                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">QR Theme Colors</label>
                          <div className="flex gap-3">
                            {[
                              { label: 'Crimson', val: '#d45129' },
                              { label: 'Emerald', val: '#10b981' },
                              { label: 'Gold', val: '#eab308' },
                              { label: 'Obsidian', val: '#09090b' }
                            ].map(theme => (
                              <button
                                key={theme.val}
                                onClick={() => { playBeep(800, 0.04); setQrColor(theme.val); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-[10px] font-bold text-white transition-all cursor-pointer"
                              >
                                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: theme.val }} />
                                {theme.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Sliders / Toggles */}
                        <div className="space-y-4 pt-2 border-t border-zinc-900/80">
                          
                          {/* Label Enabled */}
                          <div className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-lg border border-zinc-900">
                            <div>
                              <div className="text-xs font-bold text-white">Include Brand Labels</div>
                              <div className="text-[10px] text-neutral-500 font-sans">Add Quorum logo/scat lines</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={qrLabelEnabled}
                                onChange={e => { playBeep(800, 0.04); setQrLabelEnabled(e.target.checked); }}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary" />
                            </label>
                          </div>

                          {/* Center Brand Badge */}
                          <div className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-lg border border-zinc-900">
                            <div>
                              <div className="text-xs font-bold text-white">Center Brand 'Q' Badge</div>
                              <div className="text-[10px] text-neutral-500 font-sans">Inject aesthetic brand seal</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={qrLogoEnabled}
                                onChange={e => { playBeep(800, 0.04); setQrLogoEnabled(e.target.checked); }}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary" />
                            </label>
                          </div>

                          {/* Size Customizer Slider */}
                          <div className="space-y-1 bg-zinc-900/30 p-3 rounded-lg border border-zinc-900">
                            <div className="flex justify-between text-xs text-neutral-400 font-bold">
                              <span>Image Sizing</span>
                              <span className="font-mono text-primary font-bold">{qrSize}px</span>
                            </div>
                            <input
                              type="range"
                              min={150}
                              max={350}
                              step={25}
                              value={qrSize}
                              onChange={e => setQrSize(Number(e.target.value))}
                              className="w-full accent-primary bg-zinc-850 h-1.5 rounded-lg cursor-pointer"
                            />
                          </div>

                        </div>

                        {/* 2. BATCH PRINTING SHEET */}
                        <div className="space-y-4 pt-4 border-t border-zinc-900">
                          <h3 className="text-sm font-extrabold tracking-widest text-neutral-400 uppercase font-mono pb-2 flex items-center justify-between">
                            <span>2. BATCH PRINTING SHEET</span>
                            <span className="text-[10px] text-primary lowercase font-normal font-sans">multi-sticker PDF</span>
                          </h3>
                          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                            Generate a single print-ready A4 PDF containing stickers for all your dining tables in a clean, cutable 2-column grid.
                          </p>

                          {/* Quick selection presets */}
                          <div className="flex gap-2 justify-between items-center text-xs">
                            <span className="text-neutral-500 font-bold">Standard Tables:</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  playBeep(800, 0.04);
                                  setSheetTables(['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6']);
                                }}
                                className="text-[10px] font-bold text-primary hover:underline uppercase cursor-pointer bg-transparent border-none p-0"
                              >
                                Select All
                              </button>
                              <span className="text-neutral-700">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  playBeep(800, 0.04);
                                  setSheetTables([]);
                                }}
                                className="text-[10px] font-bold text-neutral-500 hover:underline uppercase cursor-pointer bg-transparent border-none p-0"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>

                          {/* Checkbox grid for standard tables */}
                          <div className="grid grid-cols-2 gap-2 bg-zinc-900/20 p-3 rounded-lg border border-zinc-900">
                            {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map(table => {
                              const isChecked = sheetTables.includes(table);
                              return (
                                <label
                                  key={table}
                                  className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-300 hover:text-white"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      playBeep(800, 0.04);
                                      if (isChecked) {
                                        setSheetTables(prev => prev.filter(t => t !== table));
                                      } else {
                                        setSheetTables(prev => [...prev, table]);
                                      }
                                    }}
                                    className="w-4 h-4 rounded text-primary bg-zinc-900 border-zinc-850 focus:ring-0 accent-primary"
                                  />
                                  <span>{table}</span>
                                </label>
                              );
                            })}
                          </div>

                          {/* Custom tables section for PDF */}
                          <div className="space-y-1.5 pt-1">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Add Custom Table to Sheet</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newCustomTableInput}
                                onChange={(e) => setNewCustomTableInput(e.target.value)}
                                placeholder="e.g. VIP Booth, Bar Seat 1"
                                className="flex-1 bg-zinc-900 border border-zinc-850 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-primary font-semibold"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newCustomTableInput.trim()) {
                                      playBeep(800, 0.04);
                                      setCustomTablesToSheet(prev => [...new Set([...prev, newCustomTableInput.trim()])]);
                                      setNewCustomTableInput('');
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newCustomTableInput.trim()) {
                                    playBeep(800, 0.04);
                                    setCustomTablesToSheet(prev => [...new Set([...prev, newCustomTableInput.trim()])]);
                                    setNewCustomTableInput('');
                                  }
                                }}
                                className="px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Custom tables list */}
                          {customTablesToSheet.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-neutral-500 font-bold uppercase block">Added Custom Tables ({customTablesToSheet.length}):</span>
                              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-zinc-900/10 border border-zinc-900 rounded-lg">
                                {customTablesToSheet.map(table => (
                                  <div
                                    key={table}
                                    className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded bg-zinc-900 border border-zinc-850 text-[10px] font-bold text-neutral-300"
                                  >
                                    <span>{table}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playBeep(700, 0.04);
                                        setCustomTablesToSheet(prev => prev.filter(t => t !== table));
                                      }}
                                      className="text-neutral-500 hover:text-red-400 p-0.5 rounded cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Generate PDF Button */}
                          <button
                            type="button"
                            onClick={generateMultiStickersPDF}
                            className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-primary text-black hover:opacity-95 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-primary/10"
                          >
                            <FileText className="w-4 h-4 stroke-[2.5]" /> Download Multi-Sticker PDF
                          </button>
                        </div>

                      </div>

                      {/* Right: Printable Layout Sticker Sheet Preview */}
                      <div className="lg:col-span-7 flex flex-col justify-between bg-zinc-950 border border-zinc-900 rounded-xl p-6 relative overflow-hidden">
                        
                        {/* Cut lines grid guide indicator */}
                        <div className="absolute top-3 left-6 text-[9px] text-neutral-600 font-mono tracking-widest uppercase">
                          WYSIWYG ACTIVE PRINT COVER PREVIEW
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center py-6">
                          
                          {/* Cut Label Card (This simulates what they print!) */}
                          <div id="quorum-sticker-frame" className="bg-white border-2 border-dashed border-zinc-300 rounded-2xl p-8 max-w-sm w-full text-center space-y-4 shadow-xl transition-all duration-300 relative">
                            
                            {/* Inner Header branding */}
                            <div className="space-y-0.5">
                              <h2 className="text-xl font-black text-zinc-900 tracking-[0.2em]">QUORUM</h2>
                              <p className="text-[9px] font-black tracking-widest text-[#d45129] uppercase">
                                High-End Digital Ordering
                              </p>
                            </div>

                            {/* Centered QR wrapper */}
                            <div className="relative flex justify-center py-2">
                              <TableQRCodeComponent 
                                table={qrSelectedTable} 
                                size={qrSize} 
                                color={qrColor} 
                                onGenerated={(url) => setPreviewSrc(url)}
                              />
                              
                              {/* Central Overlap Brand Seal 'Q' badge inside QR Code */}
                              {qrLogoEnabled && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-lg border-2 border-zinc-900 flex items-center justify-center font-black text-zinc-950 shadow-md">
                                  Q
                                </div>
                              )}
                            </div>

                            {/* Dining Table Label */}
                            <div className="space-y-1.5">
                              <h3 className="text-2xl font-black text-zinc-950 tracking-tight leading-none uppercase">
                                {qrSelectedTable}
                              </h3>
                              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed max-w-[240px] mx-auto font-sans">
                                Scan this menu sticker with your camera to open table-direct billing.
                              </p>
                            </div>

                            {/* Fine Cutline Guide indicator */}
                            <div className="absolute bottom-2 left-2 text-[8px] font-mono font-bold text-zinc-300 pointer-events-none">
                              [CUT ALONG DASHES]
                            </div>
                          </div>

                        </div>

                        {/* Workspace Command Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 border-t border-zinc-900/60 pt-5">
                          <button
                            type="button"
                            onClick={() => {
                              if (previewSrc) {
                                playBeep(1200, 0.08);
                                handlePrintQR(qrSelectedTable, previewSrc);
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 py-3 border border-zinc-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer bg-transparent"
                          >
                            <Printer className="w-3.5 h-3.5 text-neutral-400" /> Print Label
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (previewSrc) {
                                handleDownloadQR(qrSelectedTable, previewSrc);
                              }
                            }}
                            className="flex items-center justify-center gap-1.5 py-3 border border-zinc-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer bg-transparent"
                          >
                            <Download className="w-3.5 h-3.5 text-neutral-400" /> Download PNG
                          </button>

                          <button
                            type="button"
                            onClick={generateMultiStickersPDF}
                            className="flex items-center justify-center gap-1.5 py-3 border border-zinc-800 text-white bg-zinc-900/30 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-900 transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary" /> Download PDF
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playChime(true);
                              setSelectedTableForGuest(qrSelectedTable);
                              setPerspective('guest-menu');
                            }}
                            className="flex items-center justify-center gap-1.5 py-3 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-wider hover:opacity-95 transition-all cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Sit Down & Order
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* =========================================
                  TAB 5: APP PREFERENCES / SETTINGS
                  ========================================= */}
              {activeTab === 'settings' && (
                <div className="bg-zinc-950 rounded-xl border border-zinc-900 p-6 max-w-2xl space-y-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">Console Configuration</h3>
                    <p className="text-xs text-neutral-500 mt-1">Fine-tune the local terminal operations.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl border border-zinc-850">
                      <div>
                        <h4 className="font-bold text-sm text-white">Acoustic Keyboard Chimes</h4>
                        <p className="text-xs text-neutral-500">Play mechanical feedback tones during inputs.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl border border-zinc-850">
                      <div>
                        <h4 className="font-bold text-sm text-white">Full-Fidelity Cashier Drawer Sync</h4>
                        <p className="text-xs text-neutral-500 font-sans">Verify local payouts instantly via WebSockets.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    <div className="p-4 bg-neutral-900 rounded-xl border border-zinc-850 space-y-3 text-left">
                      <h4 className="font-bold text-sm text-white">Local System Reset</h4>
                      <p className="text-xs text-neutral-500">Reset floor registers, personnel directories, and mock tickets.</p>
                      <button
                        onClick={() => {
                          playBeep(200, 0.2);
                          window.location.reload();
                        }}
                        className="px-4 py-2 bg-danger text-white font-bold text-xs rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Reset System State
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 w-full z-50 flex justify-around items-center px-4 py-2 md:hidden bg-zinc-950 border-t border-zinc-900 shadow-2xl">
              <button
                onClick={() => { playBeep(700, 0.04); setActiveTab('overview'); }}
                className={`flex flex-col items-center justify-center p-1.5 text-[9px] uppercase font-bold tracking-widest ${
                  activeTab === 'overview' ? 'text-primary' : 'text-neutral-500'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mb-0.5" /> Floor
              </button>
              
              <button
                onClick={() => { playBeep(700, 0.04); setActiveTab('live-orders'); }}
                className={`flex flex-col items-center justify-center p-1.5 text-[9px] uppercase font-bold tracking-widest ${
                  activeTab === 'live-orders' ? 'text-primary' : 'text-neutral-500'
                }`}
              >
                <Receipt className="w-4 h-4 mb-0.5" /> Orders
              </button>

              <button
                onClick={() => { playBeep(700, 0.04); setActiveTab('kitchen'); }}
                className={`flex flex-col items-center justify-center p-1.5 text-[9px] uppercase font-bold tracking-widest ${
                  activeTab === 'kitchen' ? 'text-primary' : 'text-neutral-500'
                }`}
              >
                <ChefHat className="w-4 h-4 mb-0.5" /> Kitchen
              </button>

              <button
                onClick={() => { playBeep(700, 0.04); setActiveTab('qr-station'); }}
                className={`flex flex-col items-center justify-center p-1.5 text-[9px] uppercase font-bold tracking-widest ${
                  activeTab === 'qr-station' ? 'text-primary' : 'text-neutral-500'
                }`}
              >
                <QrCode className="w-4 h-4 mb-0.5" /> Table QRs
              </button>

              {currentUser?.role === 'Owner' && (
                <button
                  onClick={() => { playBeep(700, 0.04); setActiveTab('staff'); }}
                  className={`flex flex-col items-center justify-center p-1.5 text-[9px] uppercase font-bold tracking-widest ${
                    activeTab === 'staff' ? 'text-primary' : 'text-neutral-500'
                  }`}
                >
                  <Users className="w-4 h-4 mb-0.5" /> Staff
                </button>
              )}
            </nav>

          </main>

          {/* =========================================
              MODAL DIALOG: ADD STAFF CREDENTIALS
              ========================================= */}
          {isAddStaffOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
                  <h3 className="font-display font-bold text-lg text-white">New Staff Credentials</h3>
                  <button
                    onClick={() => { playBeep(600, 0.05); setIsAddStaffOpen(false); }}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleCreateStaff} className="p-6 space-y-5 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Full Name</label>
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={e => setNewStaffName(e.target.value)}
                      placeholder="e.g. Jean Pierre"
                      className="w-full bg-neutral-900 border border-zinc-850 p-3.5 rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Operational Role</label>
                      <select
                        value={newStaffRole}
                        onChange={e => setNewStaffRole(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-zinc-850 p-3.5 rounded-lg text-sm text-white focus:outline-none focus:border-primary"
                      >
                        <option value="Chef">Chef</option>
                        <option value="Waiter">Waiter</option>
                        <option value="Manager">Manager</option>
                        <option value="Owner">Owner</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Terminal PIN</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={newStaffPin}
                        onChange={e => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="4-digit"
                        className="w-full bg-neutral-900 border border-zinc-850 p-3.5 rounded-lg text-sm font-mono tracking-widest text-white text-center focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                  </div>

                  {/* Immediate authorization flag toggle */}
                  <div className="flex items-center gap-3 p-4 bg-neutral-900/60 rounded-xl border border-zinc-850">
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">Grant Immediate Access</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">User can log in to terminals instantly</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStaffImmediateAccess}
                        onChange={e => setNewStaffImmediateAccess(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>

                  {/* Submission Buttons */}
                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => { playBeep(600, 0.05); setIsAddStaffOpen(false); }}
                      className="flex-1 py-3.5 border border-zinc-800 text-neutral-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-zinc-900 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-primary text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      Create User
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

          {/* =========================================
              MODAL DRAWER: WAITER NEW MANUAL ORDER ENTRY
              ========================================= */}
          {isNewManualOrderOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-zinc-950 border-l border-zinc-900 h-full max-w-md w-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-900 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">Manual Order Dispatch</h3>
                    <p className="text-xs text-neutral-500 mt-1">Select table and items to dispatch.</p>
                  </div>
                  <button
                    onClick={() => { playBeep(600, 0.05); setIsNewManualOrderOpen(false); }}
                    className="p-1 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Sidebar Body scroll */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  {/* Select Table */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Dining Table</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map(t => (
                        <button
                          key={t}
                          onClick={() => { playBeep(850, 0.04); setManualOrderTable(t); }}
                          className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                            manualOrderTable === t
                              ? 'border-primary bg-primary/10 text-white'
                              : 'border-zinc-850 bg-neutral-900/60 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Menu items Selector */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Add Items</label>
                    <div className="space-y-2.5">
                      {MENU_ITEMS.map(item => {
                        const qty = manualOrderCart[item.id] || 0;
                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-neutral-900 rounded-lg flex items-center justify-between border border-zinc-850/60"
                          >
                            <div className="text-left">
                              <p className="font-bold text-sm text-white">{item.name}</p>
                              <p className="text-xs font-mono text-primary mt-0.5">₹{item.price.toFixed(2)}</p>
                            </div>
                            
                            <div className="flex items-center gap-2.5">
                              {qty > 0 && (
                                <>
                                  <button
                                    onClick={() => handleManualOrderRemove(item.id)}
                                    className="text-neutral-400 hover:text-[#ffb5a0] transition-colors"
                                  >
                                    <MinusCircle className="w-5.5 h-5.5" />
                                  </button>
                                  <span className="font-mono text-sm font-bold text-white w-4 text-center">{qty}</span>
                                </>
                              )}
                              <button
                                onClick={() => handleManualOrderAdd(item.id)}
                                className="text-neutral-400 hover:text-primary transition-colors"
                              >
                                <PlusCircle className="w-5.5 h-5.5" />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer dispatch metrics */}
                <div className="p-6 border-t border-zinc-900 bg-zinc-950 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wider text-neutral-400 uppercase">Subtotal</span>
                    <span className="font-mono font-bold text-xl text-white">₹{manualOrderTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleManualOrderSubmit}
                    disabled={manualOrderTotal === 0}
                    className="w-full py-4 bg-primary disabled:opacity-45 text-black font-bold text-sm rounded-xl uppercase tracking-wider hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Dispatch to Chefs
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================
          PERSPECTIVE 4: GUEST QR ORDERING MENU (LIGHT THEME)
          ========================================= */}
      {perspective === 'guest-menu' && (
        <div className="flex-1 flex flex-col bg-[#F9F9F9] text-zinc-900 selection:bg-primary/20 select-none animate-in fade-in duration-300">
          
          {/* Editorial Top header */}
          <header className="border-b border-zinc-200 bg-white/95 sticky top-0 z-40 backdrop-blur shrink-0">
            <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => { playBeep(600, 0.05); setPerspective('landing'); }}>
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center font-bold text-white text-base tracking-tighter">
                  Q
                </div>
                <span className="font-display font-bold text-sm tracking-widest text-zinc-900">QUORUM</span>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-widest pl-2">· GUEST ORDERING</span>
              </div>

              {/* Table identification selector */}
              <div className="flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Your Table:</span>
                <select
                  value={selectedTableForGuest}
                  onChange={e => { playBeep(850, 0.04); setSelectedTableForGuest(e.target.value); }}
                  className="bg-transparent border-none text-xs font-bold text-zinc-900 focus:outline-none focus:ring-0 p-0 pr-6 cursor-pointer"
                >
                  <option value="Table 1">Table 1</option>
                  <option value="Table 2">Table 2</option>
                  <option value="Table 3">Table 3</option>
                  <option value="Table 4">Table 4</option>
                  <option value="Table 5">Table 5</option>
                  <option value="Table 6">Table 6</option>
                </select>
              </div>

              <button
                onClick={() => { playBeep(600, 0.05); setPerspective('landing'); }}
                className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Exit Menu
              </button>
            </div>
          </header>

          {/* Interactive Hero Intro */}
          <div className="bg-white border-b border-zinc-200">
            <div className="max-w-4xl mx-auto px-6 py-8 text-center space-y-3">
              <span className="text-[10px] font-bold tracking-widest text-primary uppercase">Maison Quorum</span>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Interactive Culinary Menu</h2>
              <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                Browse our seasonal curation, add items, and dispatch them directly to the Kitchen line below.
              </p>
            </div>
          </div>

          {/* Main category navigations & lists */}
          <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Category selection and menus list (left side) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Category tabs */}
              <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                {['Starters', 'Mains', 'Drinks', 'Desserts'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { playBeep(800, 0.04); setActiveCategory(cat as any); }}
                    className={`flex-1 py-3 text-center rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Items feed list */}
              <div className="space-y-4">
                {MENU_ITEMS.filter(m => m.category === activeCategory).map(item => {
                  const cartQty = guestCart[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-zinc-200 p-5 flex gap-5 items-center justify-between hover:shadow-md transition-all group"
                    >
                      <div className="flex-1 text-left space-y-1.5 pr-4">
                        <h4 className="font-sans font-bold text-base text-zinc-900 group-hover:text-primary transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-xs text-zinc-500 leading-relaxed font-normal">
                          {item.description}
                        </p>
                        <p className="text-sm font-bold text-zinc-900 pt-1 font-mono">
                          ₹{item.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Image + Control center on the right */}
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 rounded-lg object-cover bg-zinc-100 border border-zinc-100"
                        />

                        {cartQty > 0 ? (
                          <div className="flex items-center gap-2 bg-neutral-100 px-2 py-1 rounded-full border border-neutral-200">
                            <button
                              onClick={() => handleRemoveCart(item.id)}
                              className="text-zinc-500 hover:text-zinc-900"
                            >
                              <MinusCircle className="w-5 h-5" />
                            </button>
                            <span className="font-mono text-xs font-bold text-zinc-900 w-4 text-center">{cartQty}</span>
                            <button
                              onClick={() => handleAddCart(item.id)}
                              className="text-zinc-500 hover:text-zinc-900"
                            >
                              <PlusCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddCart(item.id)}
                            className="w-full py-1.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-full uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Add +
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

            {/* Sticky guest cart summary panel (right side) */}
            <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm sticky top-28 space-y-6 text-left">
              <div>
                <h3 className="font-bold text-lg text-zinc-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-zinc-800" /> Dining Bill
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Dispatched to your digital table.</p>
              </div>

              {/* Items summary */}
              <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {Object.entries(guestCart).map(([id, qty]) => {
                  const item = MENU_ITEMS.find(m => m.id === id)!;
                  const q = qty as number;
                  return (
                    <div key={id} className="flex justify-between items-center text-xs">
                      <div className="flex-1 pr-2">
                        <span className="font-semibold text-zinc-800">{item.name}</span>
                        <span className="text-zinc-400 ml-1.5">x{q}</span>
                      </div>
                      <span className="font-mono font-bold text-zinc-900">₹{(item.price * q).toFixed(2)}</span>
                    </div>
                  );
                })}

                {Object.keys(guestCart).length === 0 && (
                  <p className="text-xs text-zinc-400 py-6 text-center italic">
                    Bill is empty. Tap menu items to populate.
                  </p>
                )}
              </div>

              {/* Customer Name Input */}
              {Object.keys(guestCart).length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-zinc-100 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">Your Name (Required to Order)</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={e => {
                      setGuestName(e.target.value);
                      localStorage.setItem('quorum_guest_name', e.target.value);
                    }}
                    placeholder="Enter your name..."
                    className="w-full bg-neutral-50 border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-900 placeholder-neutral-400 font-semibold"
                  />
                </div>
              )}

              {/* Order Notes */}
              {Object.keys(guestCart).length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Dietary/Kitchen Requests</label>
                  <textarea
                    value={guestNotes}
                    onChange={e => setGuestNotes(e.target.value)}
                    placeholder="e.g. Extra hot, no cilantro..."
                    className="w-full bg-neutral-50 border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-800 focus:outline-none focus:border-zinc-900 placeholder-neutral-400"
                    rows={2}
                  />
                </div>
              )}

              {/* Calculations footer */}
              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Dining Subtotal</span>
                  <span className="font-mono">₹{guestCartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Hospitality Tax (8%)</span>
                  <span className="font-mono">₹{(guestCartTotal * 0.08).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-zinc-900 pt-2 border-t border-zinc-100/60">
                  <span>Grand Total</span>
                  <span className="font-mono">₹{(guestCartTotal * 1.08).toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order CTA */}
              <button
                onClick={handlePlaceOrder}
                disabled={Object.keys(guestCart).length === 0}
                className="w-full py-4 bg-zinc-900 disabled:opacity-45 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Send Order to Kitchen
              </button>
            </div>

          </div>

        </div>
      )}

      {perspective === 'order-tracking' && (() => {
        const order = orders.find(o => o.id === activeTrackingOrderId);
        
        // Helper to get index
        const getStatusStepIndex = (status: string) => {
          switch (status) {
            case 'received': return 0;
            case 'preparing': return 1;
            case 'ready': return 2;
            case 'served': return 3;
            case 'paid': return 4;
            default: return 0;
          }
        };

        const currentStep = order ? getStatusStepIndex(order.status) : 1;
        const currentName = order?.customerName || guestName || 'Guest';

        return (
          <div className="min-h-screen bg-neutral-50/50 pb-20 animate-in fade-in duration-300">
            {/* Guest Menu Navigation Bar */}
            <div className="bg-white border-b border-zinc-100 sticky top-0 z-40 px-4 sm:px-6 py-4 shadow-xs">
              <div className="max-w-3xl mx-auto flex items-center justify-between">
                <button
                  onClick={() => setPerspective('guest-menu')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-bold text-xs uppercase tracking-wider cursor-pointer bg-transparent border-0"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-400" /> Back to Menu
                </button>
                <span className="font-mono text-[10px] font-black text-zinc-400 tracking-widest uppercase">
                  LIVE STATUS PORTAL
                </span>
                <button
                  onClick={() => setPerspective('guest-menu')}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[10px] sm:text-xs rounded-full uppercase tracking-wider transition-all cursor-pointer"
                >
                  Order More
                </button>
              </div>
            </div>

            <div className="max-w-xl sm:max-w-2xl mx-auto py-12 px-4 space-y-8 text-center">
              
              {/* Order Info Title Card */}
              <div className="space-y-1">
                <p className="text-xs font-extrabold tracking-widest text-[#d45129] uppercase font-mono">
                  ORDER #{order?.id || activeTrackingOrderId || '83788D6F'} · {order?.table || selectedTableForGuest}
                </p>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 font-sans mt-2">
                  Hello {currentName}
                </h1>
                <p className="text-sm sm:text-base text-zinc-500 font-medium leading-relaxed mt-2 max-w-md mx-auto">
                  {order?.status === 'received' && "We've successfully received your order and are routing it to the kitchen."}
                  {order?.status === 'preparing' && "We're preparing your hot dishes now. We'll have your order ready in about 10 minutes."}
                  {order?.status === 'ready' && "Your order is ready to collect! Visit the counter to receive your hot meal."}
                  {order?.status === 'served' && "Delivered! Your delicious hot meal has been served at your table. Enjoy!"}
                  {order?.status === 'paid' && "Thank you! Your payment has been verified successfully. Enjoy your meal!"}
                  {!order && "Connecting to restaurant live tracking servers..."}
                </p>
              </div>

              {/* Progress Stepper Section */}
              <div className="bg-white border border-zinc-150 rounded-2xl p-6 sm:p-8 shadow-xs relative">
                <div className="relative flex justify-between items-center w-full">
                  {/* Background Connective line */}
                  <div className="absolute top-5 sm:top-6 left-6 right-6 h-[4px] bg-zinc-100 rounded -z-0" />
                  
                  {/* Dynamic Filled connective line */}
                  <div 
                    className="absolute top-5 sm:top-6 left-6 h-[4px] bg-[#d45129] rounded -z-0 transition-all duration-700 ease-out" 
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  />

                  {/* STEP 1: RECEIVED */}
                  <div className="flex flex-col items-center relative z-10 w-14 sm:w-20">
                    <div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-xs transition-all duration-500 ${
                        currentStep >= 0 
                          ? 'bg-[#d45129] text-white scale-105 shadow-md' 
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {currentStep > 0 ? <Check className="w-5 h-5 stroke-[3]" /> : <Clock className="w-5 h-5 animate-pulse" />}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black tracking-widest mt-3 transition-colors duration-500 ${
                      currentStep >= 0 ? 'text-[#d45129]' : 'text-zinc-400'
                    }`}>
                      RECEIVED
                    </span>
                  </div>

                  {/* STEP 2: PREPARING */}
                  <div className="flex flex-col items-center relative z-10 w-14 sm:w-20">
                    <div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-xs transition-all duration-500 ${
                        currentStep >= 1 
                          ? 'bg-[#d45129] text-white scale-105 shadow-md' 
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {currentStep > 1 ? <Check className="w-5 h-5 stroke-[3]" /> : <ChefHat className="w-5 h-5" />}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black tracking-widest mt-3 transition-colors duration-500 ${
                      currentStep >= 1 ? 'text-[#d45129]' : 'text-zinc-400'
                    }`}>
                      PREPARING
                    </span>
                  </div>

                  {/* STEP 3: READY */}
                  <div className="flex flex-col items-center relative z-10 w-14 sm:w-20">
                    <div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-xs transition-all duration-500 ${
                        currentStep >= 2 
                          ? 'bg-[#d45129] text-white scale-105 shadow-md' 
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {currentStep > 2 ? <Check className="w-5 h-5 stroke-[3]" /> : <Sparkles className="w-5 h-5" />}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black tracking-widest mt-3 transition-colors duration-500 ${
                      currentStep >= 2 ? 'text-[#d45129]' : 'text-zinc-400'
                    }`}>
                      READY
                    </span>
                  </div>

                  {/* STEP 4: SERVED */}
                  <div className="flex flex-col items-center relative z-10 w-14 sm:w-20">
                    <div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-xs transition-all duration-500 ${
                        currentStep >= 3 
                          ? 'bg-[#d45129] text-white scale-105 shadow-md' 
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {currentStep > 3 ? <Check className="w-5 h-5 stroke-[3]" /> : <ShoppingBag className="w-5 h-5" />}
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black tracking-widest mt-3 transition-colors duration-500 ${
                      currentStep >= 3 ? 'text-[#d45129]' : 'text-zinc-400'
                    }`}>
                      SERVED
                    </span>
                  </div>

                  {/* STEP 5: PAID */}
                  <div className="flex flex-col items-center relative z-10 w-14 sm:w-20">
                    <div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold border-4 border-white shadow-xs transition-all duration-500 ${
                        currentStep >= 4 
                          ? 'bg-[#d45129] text-white scale-105 shadow-md' 
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-black tracking-widest mt-3 transition-colors duration-500 ${
                      currentStep >= 4 ? 'text-[#d45129]' : 'text-zinc-400'
                    }`}>
                      PAID
                    </span>
                  </div>

                </div>

                {/* Pulsing Live Updates Banner */}
                <div className="mt-8 border-t border-zinc-100 pt-5 flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="font-semibold">Live status updates every few seconds</span>
                </div>
              </div>

              {/* Order Summary & Receipt details */}
              {order ? (
                <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs text-left space-y-4">
                  <h3 className="font-bold text-base text-zinc-900 border-b border-zinc-100 pb-3 uppercase tracking-wider">
                    Your Order Summary
                  </h3>
                  
                  <div className="divide-y divide-zinc-100">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[#d45129] font-bold">×{it.qty}</span>
                          <span className="text-zinc-800 font-medium">{it.name}</span>
                        </div>
                        <span className="font-mono text-zinc-900 font-bold">₹{(it.price * it.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-zinc-100 pt-4 space-y-2">
                    <div className="flex justify-between items-center text-xs text-zinc-500">
                      <span>Dining Subtotal</span>
                      <span className="font-mono">₹{order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-500">
                      <span>Hospitality Tax (8%)</span>
                      <span className="font-mono">₹{(order.total * 0.08).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-black text-zinc-900 pt-2 border-t border-zinc-100/60">
                      <span>Grand Total</span>
                      <span className="font-mono text-[#d45129] text-base">₹{(order.total * 1.08).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl text-zinc-400 italic text-sm">
                  Waiting for kitchen dispatch connection... If your order was cleared, click below to place a new order.
                </div>
              )}

              {/* Payment/Verification Cream Banner */}
              <div className="bg-[#FCF6F0] border border-[#F0DFD3] text-[#7A4B31] rounded-xl p-4 text-xs text-center font-semibold leading-relaxed shadow-xs">
                {order?.status !== 'paid' ? (
                  <span>Pay at counter · Cash, Card, or UPI Bank Transfer. Your waiter Sarah Lopez will verify the receipt and close your tab.</span>
                ) : (
                  <span className="flex items-center justify-center gap-1 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tab Closed & Paid! Thank you for dining with us today. Your invoice has been digitally finalized.
                  </span>
                )}
              </div>

              {/* Navigation CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setPerspective('guest-menu')}
                  className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl uppercase tracking-widest transition-all shadow-xs cursor-pointer"
                >
                  View Menu / Order More
                </button>
                
                <button
                  onClick={() => {
                    playBeep(450, 0.05);
                    localStorage.removeItem('quorum_active_order_id');
                    setActiveTrackingOrderId('');
                    setPerspective('landing');
                  }}
                  className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl uppercase tracking-widest transition-all cursor-pointer"
                >
                  Start Fresh / New Order
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* =========================================
          QR SCANNER OVERLAY MODAL (FULL EXPERIENCE)
          ========================================= */}
      {isQrScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-900 flex justify-between items-center bg-zinc-950">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <h3 className="font-display font-extrabold text-base text-white uppercase tracking-wider font-mono">
                  Live Table QR Scanner
                </h3>
              </div>
              
              <button
                onClick={() => { playBeep(600, 0.05); setIsQrScannerOpen(false); }}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer bg-zinc-900/60 hover:bg-zinc-900 p-1.5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              
              {/* Scan Screen Frame Viewport */}
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-video flex flex-col items-center justify-center">
                
                {/* Simulated scan lasers overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
                
                {/* Dynamic scan line sweeping */}
                {(!qrScannerError || cameraActive) && (
                  <div className="absolute left-4 right-4 top-1/2 h-[3px] bg-primary shadow-[0_0_15px_#d45129] pointer-events-none animate-[bounce_3s_infinite_ease-in-out]" />
                )}

                {/* Laser Overlay corner brackets */}
                <div className="absolute top-6 left-6 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-6 right-6 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-6 left-6 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-6 right-6 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />

                {/* Video HTML element */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${
                    cameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                  }`}
                />

                {/* Fallback frame if camera blocked */}
                {!cameraActive && (
                  <div className="p-8 text-center space-y-4 max-w-sm relative z-10 animate-in fade-in duration-500">
                    <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-primary">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-white text-sm">Webcam Access Suspended</h4>
                      <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                        Camera input is unavailable or blocked in this browser frame. Use the high-fidelity simulator or manual file analyzer below!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bento Grid: Two Channels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Channel A: Drag & Drop Image Analyzer */}
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 space-y-3.5 text-left relative group hover:border-zinc-850 transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <h4 className="font-sans font-bold text-xs text-white uppercase tracking-wider">
                      Sticker Image Analyzer
                    </h4>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium leading-normal font-sans">
                    Generate a table sticker from our "QR Station", save it, and drag/upload the file here to parse it instantly.
                  </p>
                  
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-950 border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Upload Table Sticker
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Channel B: Live Click simulator */}
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 space-y-3.5 text-left relative group hover:border-zinc-850 transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#d45129]/10 text-primary flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="font-sans font-bold text-xs text-white uppercase tracking-wider">
                      Table Scan Simulator
                    </h4>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium leading-normal font-sans">
                    Instantly simulate physical seating scanning. Select any dining table below to trigger a custom laser sweeping animation.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map(t => {
                      const isSimulatingThis = simulatedScanActive === t;
                      return (
                        <button
                          key={t}
                          onClick={() => handleSimulateScan(t)}
                          disabled={!!simulatedScanActive}
                          className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            isSimulatingThis
                              ? 'bg-primary text-black border-primary scale-105 animate-pulse font-black'
                              : 'bg-zinc-950 border-zinc-850 text-neutral-400 hover:text-white hover:border-zinc-800'
                          }`}
                        >
                          {isSimulatingThis ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>{t}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Footer banner */}
            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900/60 text-center">
              <p className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                QUORUM DIGITAL CONNECT TERMINAL
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

