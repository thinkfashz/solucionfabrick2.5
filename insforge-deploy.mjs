#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
const INSFORGE_BASE_URL = 'https://txv86efe.us-east.insforge.app';

let totalFiles = 0;
let uploadedFiles = 0;

function addFilesRecursively(form, dir, baseDir = '') {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		const relativePath = path.join(baseDir, entry.name).replace(/\\/g, '/');

		// Skip these directories
		if (entry.isDirectory()) {
			if ([
				'node_modules', '.git', '.env', '.gitignore',
				'.next/cache', '.next/.cache', 'cache', '.cache',
				'diagnostics', 'trace', 'types'
			].includes(entry.name)) {
				continue;
			}
			addFilesRecursively(form, fullPath, baseDir ? `${baseDir}/${entry.name}` : entry.name);
		} else {
			// Skip large files
			const stat = fs.statSync(fullPath);
			if (stat.size > 5 * 1024 * 1024) { // Skip files > 5MB
				console.warn(`  ⚠️ Skipped ${relativePath} (${(stat.size / 1024 / 1024).toFixed(2)}MB)`);
				return;
			}

			try {
				const content = fs.readFileSync(fullPath);
				form.append('files', content, { filename: relativePath });
				uploadedFiles++;
				if (uploadedFiles % 50 === 0) {
					console.log(`  📦 Prepared ${uploadedFiles} files...`);
				}
			} catch {
				console.warn(`  ⚠️ Skipped ${relativePath}`);
			}
		}
	}
}

async function deployToInsForge() {
	console.log('🚀 Starting InsForge deployment...\n');

	// Create deployment package
	console.log('📦 Packaging files for deployment...');
	const form = new FormData();

	// Add public files
	const publicDir = path.join(__dirname, 'public');
	if (fs.existsSync(publicDir)) {
		console.log('  📁 Adding public files...');
		addFilesRecursively(form, publicDir, 'public');
	}

	// Add .next build output
	const nextDir = path.join(__dirname, '.next');
	if (fs.existsSync(nextDir)) {
		console.log('  📁 Adding .next build output...');
		addFilesRecursively(form, nextDir, '.next');
	}

	// Add essential config files
	const configFiles = ['package.json', 'next.config.mjs', 'tsconfig.json', 'tailwind.config.js', 'postcss.config.js'];
	for (const file of configFiles) {
		const filePath = path.join(__dirname, file);
		if (fs.existsSync(filePath)) {
			const content = fs.readFileSync(filePath);
			form.append('files', content, { filename: file });
			totalFiles++;
			uploadedFiles++;
		}
	}

	console.log(`\n📦 Total files prepared: ${uploadedFiles}\n`);

	// Deploy to InsForge
	console.log('🌐 Uploading to InsForge...');
	
	// Try different endpoints
	const endpoints = ['/api/deployments', '/deploy', '/api/upload'];
	
	for (const endpoint of endpoints) {
		try {
			const url = `${INSFORGE_BASE_URL}${endpoint}`;
			console.log(`  Trying ${url}...`);
			
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${INSFORGE_API_KEY}`,
					...form.getHeaders(),
				},
				body: form,
			});

			const responseText = await response.text();
			
			if (response.ok) {
				console.log('\n✅ Deployment successful!');
				try {
					const result = JSON.parse(responseText);
					console.log(`📍 Deployment ID: ${result.deploymentId || result.id || 'N/A'}`);
					console.log(`🔗 URL: ${result.url || 'https://txv86efe.insforge.site'}`);
				} catch {
					console.log('📍 Response:', responseText.substring(0, 200));
				}
				console.log(`⏰ Deployed at: ${new Date().toISOString()}`);
				console.log(`📦 Files uploaded: ${uploadedFiles}`);
				return { status: 'success' };
			} else if (response.status !== 404) {
				// If not 404, we found the endpoint but something else went wrong
				console.error(`\n❌ HTTP ${response.status}`);
				console.error(responseText.substring(0, 500));
				process.exit(1);
			}
		} catch (err) {
			console.warn(`  ❌ ${endpoint} failed: ${err.message}`);
		}
	}
	
	console.error('\n❌ Could not find deployment endpoint');
	process.exit(1);
}

deployToInsForge().catch(console.error);
