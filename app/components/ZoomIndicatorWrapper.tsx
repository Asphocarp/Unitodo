'use client';

import React from 'react';
import { observer } from 'mobx-react-lite';
import { ZoomIndicator } from './ZoomIndicator';
import { zoomIndicatorStore } from '../store/zoomIndicatorStore';

export const ZoomIndicatorWrapper = observer(() => {
  return (
    <ZoomIndicator
      percentage={zoomIndicatorStore.percentage}
      isVisible={zoomIndicatorStore.isVisible}
      onHide={() => zoomIndicatorStore.hideZoomIndicator()}
    />
  );
}); 