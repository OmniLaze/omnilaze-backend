import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import axios from 'axios';

@Injectable()
export class AdminAwsService {
  private readonly logger = new Logger(AdminAwsService.name);
  
  constructor(private readonly configService: ConfigService) {}

  async triggerDeploy(ref: string) {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPO || 'omnilaze-universal';
      const githubOwner = process.env.GITHUB_OWNER || 'stevenxxzg';
      const workflowId = process.env.GITHUB_WORKFLOW_ID || 'aws-deploy.yml';
      
      if (!githubToken) {
        return {
          success: false,
          message: 'GitHub token not configured',
        };
      }
      
      const response = await axios.post(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${workflowId}/dispatches`,
        { ref },
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      
      return {
        success: true,
        message: 'Deployment triggered successfully',
        data: {
          ref,
          workflow: workflowId,
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to trigger deployment:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to trigger deployment',
      };
    }
  }

  async getDeploymentStatus(limit: number) {
    try {
      const githubToken = process.env.GITHUB_TOKEN;
      const githubRepo = process.env.GITHUB_REPO || 'omnilaze-universal';
      const githubOwner = process.env.GITHUB_OWNER || 'stevenxxzg';
      const workflowId = process.env.GITHUB_WORKFLOW_ID || 'aws-deploy.yml';
      
      if (!githubToken) {
        return {
          success: false,
          message: 'GitHub token not configured',
        };
      }
      
      const response = await axios.get(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/actions/workflows/${workflowId}/runs`,
        {
          params: { per_page: limit },
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      
      const runs = (response.data as any).workflow_runs.map((run: any) => ({
        id: run.id,
        run_number: run.run_number,
        status: run.status,
        conclusion: run.conclusion,
        head_branch: run.head_branch,
        created_at: run.created_at,
        updated_at: run.updated_at,
        html_url: run.html_url,
      }));
      
      return {
        success: true,
        message: 'Deployment status fetched',
        data: { runs },
      };
    } catch (error: any) {
      this.logger.error('Failed to get deployment status:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to get deployment status',
      };
    }
  }
}