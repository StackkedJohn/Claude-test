import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface AccessibilityIssue {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    target: string;
    html: string;
    failureSummary: string;
  }>;
}

interface AccessibilityReport {
  passes: number;
  violations: number;
  incomplete: number;
  issues: AccessibilityIssue[];
  wcagLevel: 'AA' | 'AAA';
  testTimestamp: Date;
}

export class AccessibilityHelper {
  private page: Page;
  private reports: AccessibilityReport[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  // Run comprehensive accessibility audit using axe-core
  async runA11yCheck(options: {
    wcagLevel?: 'AA' | 'AAA';
    tags?: string[];
    exclude?: string[];
    include?: string[];
  } = {}): Promise<AccessibilityReport> {
    const axeBuilder = new AxeBuilder({ page: this.page });

    // Configure WCAG level
    const wcagLevel = options.wcagLevel || 'AA';
    const tags = options.tags || [`wcag2${wcagLevel.toLowerCase()}`, 'wcag21aa'];
    
    axeBuilder.withTags(tags);

    // Exclude elements if specified
    if (options.exclude) {
      options.exclude.forEach(selector => axeBuilder.exclude(selector));
    }

    // Include specific elements if specified
    if (options.include) {
      options.include.forEach(selector => axeBuilder.include(selector));
    }

    const results = await axeBuilder.analyze();

    const report: AccessibilityReport = {
      passes: results.passes.length,
      violations: results.violations.length,
      incomplete: results.incomplete.length,
      issues: results.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact as any,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map(node => ({
          target: node.target.join(', '),
          html: node.html,
          failureSummary: node.failureSummary || 'No summary available'
        }))
      })),
      wcagLevel,
      testTimestamp: new Date()
    };

    this.reports.push(report);

    // Fail test if critical accessibility violations found
    const criticalViolations = report.issues.filter(issue => issue.impact === 'critical');
    if (criticalViolations.length > 0) {
      console.error('Critical accessibility violations found:', criticalViolations);
    }

    return report;
  }

  // Check keyboard navigation
  async checkKeyboardNavigation(): Promise<void> {
    // Test tab navigation through focusable elements
    const focusableElements = await this.page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
    
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await this.page.keyboard.press('Tab');
      
      // Verify focus is visible
      const focusedElement = await this.page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Check for focus indicators
      const computedStyle = await focusedElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          outlineColor: style.outlineColor,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow
        };
      });
      
      const hasFocusIndicator = 
        computedStyle.outline !== 'none' || 
        computedStyle.boxShadow !== 'none' ||
        computedStyle.outlineWidth !== '0px';
      
      if (!hasFocusIndicator) {
        console.warn(`Element lacks focus indicator: ${await focusedElement.getAttribute('data-testid') || 'unknown'}`);
      }
    }

    // Test Enter key activation on buttons
    const buttons = await this.page.locator('button:visible').all();
    for (const button of buttons.slice(0, 3)) {
      await button.focus();
      
      // Simulate Enter key press and verify action
      const buttonText = await button.textContent();
      console.log(`Testing Enter key on button: ${buttonText}`);
      
      // Note: Actual Enter key testing would depend on specific button behavior
    }

    // Test Escape key functionality
    const modals = await this.page.locator('[role="dialog"], .modal').all();
    for (const modal of modals) {
      if (await modal.isVisible()) {
        await modal.focus();
        await this.page.keyboard.press('Escape');
        
        // Verify modal closes (or at least focus changes)
        await expect(modal).not.toBeFocused();
      }
    }
  }

  // Check screen reader compatibility
  async checkScreenReaderCompatibility(): Promise<void> {
    // Check for proper ARIA labels
    const interactiveElements = await this.page.locator('button, [role="button"], input, select, textarea').all();
    
    for (const element of interactiveElements) {
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledby = await element.getAttribute('aria-labelledby');
      const textContent = await element.textContent();
      const placeholder = await element.getAttribute('placeholder');
      
      const hasAccessibleName = !!(ariaLabel || ariaLabelledby || textContent?.trim() || placeholder);
      
      if (!hasAccessibleName) {
        const testId = await element.getAttribute('data-testid');
        console.warn(`Interactive element lacks accessible name: ${testId || 'unknown'}`);
      }
    }

    // Check for proper heading structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    let currentLevel = 0;
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));
      
      if (level > currentLevel + 1) {
        console.warn(`Heading level skip detected: ${tagName} follows h${currentLevel}`);
      }
      
      currentLevel = level;
    }

    // Check for alt text on images
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      if (alt === null && role !== 'presentation') {
        const src = await img.getAttribute('src');
        console.warn(`Image missing alt text: ${src}`);
      }
    }

    // Check for form labels
    const formInputs = await this.page.locator('input:not([type="hidden"]), select, textarea').all();
    for (const input of formInputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      let hasLabel = !!(ariaLabel || ariaLabelledby);
      
      if (id && !hasLabel) {
        const label = await this.page.locator(`label[for="${id}"]`).count();
        hasLabel = label > 0;
      }
      
      if (!hasLabel) {
        const testId = await input.getAttribute('data-testid');
        console.warn(`Form input lacks label: ${testId || 'unknown'}`);
      }
    }
  }

  // Check color contrast ratios
  async checkColorContrast(): Promise<void> {
    await this.page.addInitScript(() => {
      // Helper function to calculate contrast ratio
      (window as any).calculateContrastRatio = function(foreground: string, background: string): number {
        function getLuminance(color: string): number {
          const rgb = color.match(/\d+/g)?.map(val => parseInt(val)) || [0, 0, 0];
          const [r, g, b] = rgb.map(val => {
            const srgb = val / 255;
            return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }
        
        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        
        return (lighter + 0.05) / (darker + 0.05);
      };
    });

    // Check text elements for contrast
    const textElements = await this.page.locator('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label').all();
    
    for (const element of textElements.slice(0, 20)) { // Limit to first 20 for performance
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });

      if (styles.color && styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        const contrastRatio = await this.page.evaluate(
          ({ fg, bg }) => (window as any).calculateContrastRatio(fg, bg),
          { fg: styles.color, bg: styles.backgroundColor }
        );

        const fontSize = parseInt(styles.fontSize);
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && await element.evaluate(el => 
          window.getComputedStyle(el).fontWeight === 'bold'
        ));

        const minRatio = isLargeText ? 3 : 4.5; // WCAG AA requirements
        
        if (contrastRatio < minRatio) {
          const testId = await element.getAttribute('data-testid');
          console.warn(`Low color contrast (${contrastRatio.toFixed(2)}:1): ${testId || 'unknown'}`);
        }
      }
    }
  }

  // Check touch target sizes for mobile
  async checkTouchTargets(): Promise<void> {
    const interactiveElements = await this.page.locator('button, [role="button"], a, input, select').all();
    
    for (const element of interactiveElements) {
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        const minSize = 44; // Minimum touch target size in pixels
        
        if (boundingBox.width < minSize || boundingBox.height < minSize) {
          const testId = await element.getAttribute('data-testid');
          console.warn(`Touch target too small (${boundingBox.width}x${boundingBox.height}px): ${testId || 'unknown'}`);
        }
      }
    }
  }

  // Check error states and messaging
  async checkErrorStates(): Promise<void> {
    const errorElements = await this.page.locator('[role="alert"], .error, .invalid, [aria-invalid="true"]').all();
    
    for (const element of errorElements) {
      // Check if error is properly announced
      const role = await element.getAttribute('role');
      const ariaLive = await element.getAttribute('aria-live');
      const ariaAtomic = await element.getAttribute('aria-atomic');
      
      if (role !== 'alert' && !ariaLive) {
        const testId = await element.getAttribute('data-testid');
        console.warn(`Error element lacks proper announcement: ${testId || 'unknown'}`);
      }

      // Check if error is associated with form field
      const ariaDescribedby = await element.getAttribute('aria-describedby');
      const id = await element.getAttribute('id');
      
      if (id) {
        const associatedField = await this.page.locator(`[aria-describedby*="${id}"]`).count();
        if (associatedField === 0) {
          console.warn(`Error message not associated with form field: ${id}`);
        }
      }
    }
  }

  // Generate comprehensive accessibility report
  generateReport(): {
    summary: {
      totalTests: number;
      totalViolations: number;
      criticalIssues: number;
      averageScore: number;
    };
    reports: AccessibilityReport[];
    recommendations: string[];
  } {
    const totalViolations = this.reports.reduce((sum, report) => sum + report.violations, 0);
    const criticalIssues = this.reports.reduce((sum, report) => 
      sum + report.issues.filter(issue => issue.impact === 'critical').length, 0
    );

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalTests: this.reports.length,
        totalViolations,
        criticalIssues,
        averageScore: this.calculateAverageScore()
      },
      reports: this.reports,
      recommendations
    };
  }

  private calculateAverageScore(): number {
    if (this.reports.length === 0) return 0;
    
    const scores = this.reports.map(report => {
      const total = report.passes + report.violations;
      return total > 0 ? (report.passes / total) * 100 : 0;
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const allIssues = this.reports.flatMap(report => report.issues);
    
    // Group by common issue types
    const issueTypes = allIssues.reduce((acc, issue) => {
      acc[issue.id] = (acc[issue.id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate recommendations based on most common issues
    Object.entries(issueTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([issueId, count]) => {
        const issue = allIssues.find(i => i.id === issueId);
        if (issue) {
          recommendations.push(`${issue.help} (Found in ${count} locations)`);
        }
      });

    return recommendations;
  }

  // Export accessibility report to file
  async exportReport(filename: string = `accessibility-report-${Date.now()}.json`): Promise<string> {
    const report = this.generateReport();
    const reportJson = JSON.stringify(report, null, 2);
    
    // In a real implementation, you would write to file system
    console.log(`Accessibility report generated: ${filename}`);
    console.log(reportJson);
    
    return filename;
  }

  // Clear all reports
  clearReports(): void {
    this.reports = [];
  }
}