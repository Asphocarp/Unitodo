import { makeAutoObservable } from 'mobx';

class ZoomIndicatorStore {
  percentage: number = 100;
  isVisible: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }

  showZoomIndicator(percentage: number) {
    this.percentage = percentage;
    this.isVisible = true;
  }

  hideZoomIndicator() {
    this.isVisible = false;
  }
}

export const zoomIndicatorStore = new ZoomIndicatorStore(); 