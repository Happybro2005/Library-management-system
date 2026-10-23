import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import * as reportService from '../services/report.service';

export async function getInventoryReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reportService.getInventoryReport();
    if (req.query.format === 'csv') {
      const csv = reportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.csv"');
      res.send(csv);
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getEbooksReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reportService.getEbookCatalogReport();
    if (req.query.format === 'csv') {
      const csv = reportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ebook-catalog-report.csv"');
      res.send(csv);
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getBorrowedBooksReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reportService.getBorrowedBooksReport();
    if (req.query.format === 'csv') {
      const csv = reportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="borrowed-books-report.csv"');
      res.send(csv);
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getHistoryReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reportService.getIssueReturnHistoryReport();
    if (req.query.format === 'csv') {
      const csv = reportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="issue-return-history.csv"');
      res.send(csv);
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSeatOccupancyReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await reportService.getSeatOccupancyReport();
    if (req.query.format === 'csv') {
      const csv = reportService.convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="seat-occupancy-report.csv"');
      res.send(csv);
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
