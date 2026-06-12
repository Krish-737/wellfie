import React, { useState } from 'react';
import { Download, Mail } from 'lucide-react';
import WellnessHero from '../dashboard/WellnessHero';
import LatestScanAnalysisCard from '../dashboard/LatestScanAnalysisCard';
import ScanQualityBanner from '../dashboard/ScanQualityBanner';
import ReportActionButton, { reportActionStyle } from '../dashboard/ReportActionButton';
import {
  getIndicatorById,
  getIndicatorIndex,
  INDICATORS,
  WELLNESS_INDICATOR_ID,
  type ScanResult,
} from '../../content/scanIndicators';
import HealthDomainsPanel from './HealthDomainsPanel';
import IndicatorModal from './IndicatorModal';

interface LatestScanSummaryProps {
  scan: ScanResult;
  scanHistory?: ScanResult[];
  isMobile: boolean;
  allowExpand?: boolean;
  onEmailLatest(): void;
  onDownload?(): void;
  onStartScan?(): void;
  emailingLatest: boolean;
  downloading?: boolean;
  emailMsg: string | null;
}

const LatestScanSummary: React.FC<LatestScanSummaryProps> = ({
  scan,
  scanHistory = [],
  isMobile,
  allowExpand = true,
  onEmailLatest,
  onDownload,
  onStartScan,
  emailingLatest,
  downloading = false,
  emailMsg,
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const wellness = getIndicatorById(WELLNESS_INDICATOR_ID);

  const openIndicator = (id: string) => {
    const idx = getIndicatorIndex(id);
    if (idx >= 0) setActiveIdx(idx);
  };

  const showDownload = typeof onDownload === 'function';

  return (
    <>
      <LatestScanAnalysisCard scan={scan} isMobile={isMobile} />

      {wellness && (
        <WellnessHero
          scan={scan}
          isMobile={isMobile}
          onScoreClick={() => openIndicator(WELLNESS_INDICATOR_ID)}
          onStartScan={onStartScan}
        />
      )}

      <HealthDomainsPanel
        scan={scan}
        scanHistory={scanHistory}
        isMobile={isMobile}
        allowExpand={allowExpand}
        onMetricClick={openIndicator}
      />

      <ScanQualityBanner scan={scan} isMobile={isMobile} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: showDownload ? '1fr 1fr' : '1fr',
        gap: 10,
        marginTop: 16,
      }}>
        <ReportActionButton
          onClick={onEmailLatest}
          disabled={emailingLatest}
          style={{ ...reportActionStyle, width: '100%', display: 'flex' }}
        >
          <Mail size={16} strokeWidth={2.2} />
          {emailingLatest ? 'Sending…' : 'Email Report'}
        </ReportActionButton>

        {showDownload && (
          <ReportActionButton
            onClick={onDownload}
            disabled={downloading}
            style={{ ...reportActionStyle, width: '100%', display: 'flex' }}
          >
            <Download size={16} strokeWidth={2.2} />
            {downloading ? 'Downloading…' : 'Download PDF'}
          </ReportActionButton>
        )}
      </div>

      {emailMsg && (
        <div style={{
          marginTop: 10,
          fontSize: 13,
          borderRadius: 8,
          padding: '8px 12px',
          background: emailMsg.startsWith('Error') ? '#fef2f2' : '#f0fdf4',
          color: emailMsg.startsWith('Error') ? '#991b1b' : '#166534',
          border: `1px solid ${emailMsg.startsWith('Error') ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {emailMsg}
        </div>
      )}

      {activeIdx !== null && (
        <IndicatorModal
          indicator={INDICATORS[activeIdx]}
          scan={scan}
          idx={activeIdx}
          total={INDICATORS.length}
          isMobile={isMobile}
          onClose={() => setActiveIdx(null)}
          onPrev={() => setActiveIdx((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setActiveIdx((i) => Math.min(INDICATORS.length - 1, (i ?? 0) + 1))}
        />
      )}
    </>
  );
};

export default LatestScanSummary;
