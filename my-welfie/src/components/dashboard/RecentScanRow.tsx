import React from 'react';

import { Activity, Download } from 'lucide-react';

import type { ScanResult } from '../../content/scanIndicators';

import { formatScanHeadline } from '../../utils/formatScanTime';

import {

  getScanDisplayScore,

  getScanDisplayTitle,

  getScanTrendStatus,

} from '../../utils/scanTrendStatus';

import { typography } from '../../style/tokens';



interface RecentScanRowProps {

  scan: ScanResult;

  index: number;

  previousScan?: ScanResult | null;

  isLast: boolean;

  onDownload?(): void;

  downloading?: boolean;

  downloadDisabled?: boolean;

}



const RecentScanRow: React.FC<RecentScanRowProps> = ({

  scan,

  index,

  previousScan,

  isLast,

  onDownload,

  downloading = false,

  downloadDisabled = false,

}) => {

  const title = getScanDisplayTitle(scan.scanned_at, index);

  const timestamp = formatScanHeadline(scan.scanned_at);

  const score = getScanDisplayScore(scan);

  const trend = getScanTrendStatus(scan, previousScan);

  const hasScore = score !== '—';



  return (

    <li

      style={{

        display: 'flex',

        alignItems: 'center',

        gap: 12,

        padding: '14px 0',

        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',

        fontFamily: typography.fontFamily,

      }}

    >

      <div

        style={{

          width: 40,

          height: 40,

          borderRadius: 10,

          background: '#f1f5f9',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          flexShrink: 0,

        }}

      >

        <Activity size={18} strokeWidth={2.2} color="#0f766e" />

      </div>



      <div style={{ flex: 1, minWidth: 0 }}>

        <div

          style={{

            fontSize: 14,

            fontWeight: 700,

            color: '#0f172a',

            lineHeight: 1.3,

          }}

        >

          {title}

        </div>

        <div

          style={{

            fontSize: 12,

            color: '#64748b',

            marginTop: 3,

            fontWeight: 500,

          }}

        >

          {timestamp}

        </div>

      </div>



      <div

        style={{

          textAlign: 'right',

          flexShrink: 0,

          minWidth: 52,

          marginRight: 4,

        }}

      >

        <div

          style={{

            fontSize: 22,

            fontWeight: 800,

            color: hasScore ? '#0f172a' : '#cbd5e1',

            lineHeight: 1,

            letterSpacing: '-0.02em',

          }}

        >

          {score}

        </div>

        {hasScore && (

          <div

            style={{

              marginTop: 4,

              fontSize: 9,

              fontWeight: 700,

              letterSpacing: '0.06em',

              color: trend.color,

              textTransform: 'uppercase',

            }}

          >

            {trend.label}

          </div>

        )}

      </div>



      {onDownload && (

        <button

          type="button"

          onClick={onDownload}

          disabled={downloading || downloadDisabled}

          aria-label={`Download report for ${title}`}

          title="Download PDF"

          style={{

            flexShrink: 0,

            width: 36,

            height: 36,

            padding: 0,

            border: 'none',

            borderRadius: 8,

            background: 'transparent',

            color: downloading ? '#94a3b8' : '#64748b',

            cursor: downloading || downloadDisabled ? 'wait' : 'pointer',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            fontFamily: typography.fontFamily,

          }}

        >

          <Download size={18} strokeWidth={2} />

        </button>

      )}

    </li>

  );

};



export default RecentScanRow;


