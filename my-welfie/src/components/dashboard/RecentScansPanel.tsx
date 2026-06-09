import React from 'react';

import { ChevronDown, Download } from 'lucide-react';

import type { ScanResult } from '../../content/scanIndicators';

import { colors, typography } from '../../style/tokens';

import ReportActionButton from './ReportActionButton';

import RecentScanRow from './RecentScanRow';



interface RecentScansPanelProps {

  scans: ScanResult[];

  totalCount: number;

  loading: boolean;

  downloadingId?: string | null;

  onViewAll?(): void;

  onDownloadAll?(): void;

  onDownloadScan?(scanId: string): void;

}



const RecentScansPanel: React.FC<RecentScansPanelProps> = ({

  scans,

  totalCount,

  loading,

  downloadingId = null,

  onViewAll,

  onDownloadAll,

  onDownloadScan,

}) => {

  const hasMoreHistory = totalCount > 4 && scans.length < totalCount;

  const downloadingAll = downloadingId === 'all';

  const showDownloadAll = !loading && scans.length > 0 && Boolean(onDownloadAll);



  return (

    <div

      style={{

        background: '#fff',

        borderRadius: 16,

        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',

        padding: '20px 18px',

        display: 'flex',

        flexDirection: 'column',

        fontFamily: typography.fontFamily,

      }}

    >

      <div

        style={{

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'space-between',

          gap: 12,

          marginBottom: 8,

        }}

      >

        <p style={{ margin: 0, ...typography.eyebrow }}>

          Recent scans

        </p>

        {showDownloadAll && (

          <ReportActionButton

            onClick={onDownloadAll}

            disabled={downloadingAll}

            ariaLabel="Download all scan reports"

            style={{ padding: '8px 12px', flexShrink: 0 }}

          >

            <Download size={14} strokeWidth={2.2} />

            {downloadingAll ? 'Downloading…' : 'Download All'}

          </ReportActionButton>

        )}

      </div>



      {loading ? (

        <div style={{ color: '#94a3b8', fontSize: 13, padding: '16px 0' }}>Loading...</div>

      ) : scans.length === 0 ? (

        <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>

          No previous scans yet.

        </div>

      ) : (

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>

          {scans.map((scan, idx) => (

            <RecentScanRow

              key={scan.id}

              scan={scan}

              index={idx}

              previousScan={scans[idx + 1]}

              isLast={idx === scans.length - 1}

              onDownload={onDownloadScan ? () => onDownloadScan(scan.id) : undefined}

              downloading={downloadingId === scan.id}

              downloadDisabled={downloadingAll}

            />

          ))}

        </ul>

      )}



      {!loading && hasMoreHistory && onViewAll && (

        <button

          type="button"

          onClick={onViewAll}

          style={{

            marginTop: 14,

            padding: '8px 0 0',

            background: 'none',

            border: 'none',

            width: '100%',

            display: 'inline-flex',

            alignItems: 'center',

            justifyContent: 'center',

            gap: 6,

            fontSize: 11,

            fontWeight: 700,

            letterSpacing: '0.08em',

            textTransform: 'uppercase',

            color: colors.tealDark,

            cursor: 'pointer',

            fontFamily: typography.fontFamily,

          }}

        >

          View All Scans

          <ChevronDown size={14} strokeWidth={2.5} />

        </button>

      )}

    </div>

  );

};



export default RecentScansPanel;


