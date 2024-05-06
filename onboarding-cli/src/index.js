import React, {useState, useEffect, useCallback} from 'react';
import {render, Text, useInput, useStdin, Box} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { exec } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import fetch from 'node-fetch';
import https from 'https';
import { v4 as uuid } from 'uuid';
import { dump } from 'js-yaml';
import fs from 'node:fs';

const agent = new https.Agent({ rejectUnauthorized: false });
const API_HOST = "https://192.168.157.239:5601"
const ES_HOST = "https://192.168.157.239:9200"
const API_KEY = process.env.API_KEY;
const ELASTIC_AGENT_ARTIFACT = "elastic-agent-8.13.2-linux-x86_64";
const ELASTIC_AGENT_DOWNLOAD_URL = `https://artifacts.elastic.co/downloads/beats/elastic-agent/${ELASTIC_AGENT_ARTIFACT}.tar.gz`;

const VIEW = {
	INTEGRATIONS: 'INTEGRATIONS',
	UNKNOWN_LOGS: 'UNKNOWN_LOGS',
	CUSTOM_LOGS: 'CUSTOM_LOGS',
	INSTALL: 'INSTALL',
};

export function generateOutputsConfig({ esHost, apiKey }) {
  return {
      default: {
        type: 'elasticsearch',
        hosts: esHost,
        api_key: Buffer.from(API_KEY, 'base64').toString(),
				protocol: 'https',
        /**
          Disabling SSL verification for local development
        */
        ssl: {
          enabled: true,
          verification_mode: 'none'
        },
      },
    };
}

function generateIntegrationInputsConfig(name) {
	const namespace = 'default';
	const id = uuid();

	switch (name) {
		case 'system':
			return {
        id: `system-logs-${id}`,
        type: 'logfile',
        data_stream: {
          namespace,
        },
        streams: [
					{
						id: `logfile-system.auth-${id}`,
						data_stream: {
							dataset: 'system.auth',
							type: 'logs',
						},
						paths: ['/var/log/auth.log*', '/var/log/secure*'],
						exclude_files: ['.gz$'],
						multiline: {
							pattern: '^s',
							match: 'after',
						},
						tags: ['system-auth'],
						processors: [
							{
								add_locale: null,
							},
						],
					},
					{
						id: `logfile-system.syslog-${id}`,
						data_stream: {
							dataset: 'system.syslog',
							type: 'logs',
						},
						paths: ['/var/log/messages*', '/var/log/syslog*', '/var/log/system*'],
						exclude_files: ['.gz$'],
						multiline: {
							pattern: '^s',
							match: 'after',
						},
						processors: [
							{
								add_locale: null,
							},
						],
					},
				],
      };
	}
}

export function generateCustomLogsInputsConfig({
  name,
  paths,
}) {
  return {
		id: `custom-logs-${uuid()}`,
		type: 'logfile',
		data_stream: {
			namespace: 'default',
		},
		streams: [
			{
				id: `logs-onboarding-${name}`,
				data_stream: {
					dataset: name,
				},
				paths,
			},
		],
	};
}

async function createCustomIntegration({ name }) {
	const endpoint = `${API_HOST}/api/fleet/epm/custom_integrations`;
	const options = {
		agent,
		method: 'post',
		headers: {
			'Authorization': `ApiKey ${API_KEY}`,
			'Content-Type': 'application/json',
			'Elastic-Api-Version': '2023-10-31',
			'kbn-xsrf': 'true',
		},
		body: JSON.stringify({
			integrationName: name,
			datasets: [
				{
					name,
					type: 'logs',
				},
			],
		}),
	};

	await fetch(endpoint, options);
}

async function installIntegration({ name }) {
	const endpoint = `${API_HOST}/api/fleet/epm/packages/${name}`;
	const options = {
		agent,
		headers: {
			'Authorization': `ApiKey ${API_KEY}`,
			'Content-Type': 'application/json',
			'Elastic-Api-Version': '2023-10-31',
			'kbn-xsrf': 'true',
		}
	};
	const status = await fetch(endpoint, { method: 'get', ...options }).then(res => res.json()).then(data => data.item.status);

	if (status !== 'installed') {
		const res = await fetch(endpoint, { method: 'post', ...options })
	}
}

function generateCustomIntegrationConfig(logsPathPattern) {
	const folderList = path.dirname(logsPathPattern).split('/');
	const integrationName = folderList[folderList.length - 1];

	return {
		name: integrationName,
		paths: [logsPathPattern],
	};
}

function detectKnownIntegrations(logFileList) {
	const foundIntegrations = new Set();
	const unknownFileList = []

	for (let logFile of logFileList) {
		if (logFile.includes('syslog')) {
			foundIntegrations.add('system');
			continue;
		}

		if (logFile.includes('mysql')) {
			foundIntegrations.add('mysql');
			continue;
		}

		if (logFile.includes('postgresql')) {
			foundIntegrations.add('postgresql');
			continue;
		}

		if (logFile.includes('nginx')) {
			foundIntegrations.add('nginx');
			continue;
		}

		unknownFileList.push(logFile);
	}

	return {
		integrationList: Array.from(foundIntegrations),
		unknownFileList
	};
}

function generateFolderPatternList(logFileList) {
	let folderList = [];

	for (let logFile of logFileList) {
		if (logFile === '') {
			continue;
		}

		const folder = path.dirname(logFile);

		if (!folderList.includes(folder)) {
			folderList.push(`${folder}/*.log`);
		}
	}

	return folderList;
}

async function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }

      resolve(stdout);
    });
  });
}

async function readOpenFiles() {
  try {
    const stdout = await execCommand(`sudo lsof -Fn | grep "log$" | awk '/^n/ {print substr($0, 2)}' | sort | uniq`);

    return stdout.split('\n');
  } catch (error) {
    console.error(error);
  }
}

function ensureElasticAgentConfigFolder() {
	try {
		fs.mkdirSync('/opt/Elastic/Agent', { recursive: true });
	} catch (error) {
		console.error(error);
	}
}

function ListItem({ label, isHighlighted, isSelected }) {
	return <Box flexDirection="row">
		<Text color={isHighlighted ? 'yellow' : 'white'}>
			{isSelected ? '◉' : '◯'}
			{' '}
			{label}
		</Text>
	</Box>;
}

function List({ items, onSubmit }) {
	const [listPosition, setListPosition] = useState(0);
	const [selectedItemList, setSelectedItemList] = useState([]);

	useInput((input, key) => {
		if (key.upArrow) {
			setListPosition((prev) => Math.max(prev - 1, 0));
		}

		if (key.downArrow) {
			setListPosition((prev) => Math.min(prev + 1, items.length - 1));
		}

		if (input === ' ') {
			const highlightedItemValue = items[listPosition].value;

			if (selectedItemList.includes(highlightedItemValue)) {
				setSelectedItemList((prev) => {
					return prev.filter((value) => value !== highlightedItemValue);
				});
			} else {
				setSelectedItemList((prev) => {
					return [...prev, highlightedItemValue];
				});
			}
		}

		if (key.return) {
			onSubmit(selectedItemList);
		}
	});

	return <>
		{items.map((item, index) => (
			<ListItem
				key={index}
				label={item.label}
				isHighlighted={index === listPosition}
				isSelected={selectedItemList.includes(item.value)}
			/>
		))}
	</>;
}

const integrationLabelMap = {
	system: 'System',
	mysql: 'MySQL',
	postgresql: 'PostgreSQL',
	nginx: 'Nginx',
}

function IntegrationListView({ integrationList, onSubmit }) {
	const items = [];

	for (let integration of integrationList) {
		if (integrationLabelMap[integration] !== undefined) {
			items.push({ label: integrationLabelMap[integration], value: integration });
		}
	}

	return <>
		<Text>Found logs for these integrations:</Text>
		<List items={items} onSubmit={onSubmit} />
	</>
}

function UnknownLogFolderListView({ folderPatternList, onSubmit, onBack }) {
	const excludeList = ['/var/log/*.log'];
	const items = folderPatternList
		.filter((folder) => !excludeList.includes(folder))
		.map((folder) => ({ label: folder, value: folder }));

	return <>
		<Text>Also found logs in these locations:</Text>
		<List items={items} onSubmit={onSubmit} />
	</>
}

function CustomLogsView({ onSubmit }) {
		const [pattern, setPattern] = useState('');

		return (
			<>
			<Text>You can also provide a custom path:</Text>
			<Box>
				<Box marginRight={1}>
					<Text>Custom Log File Pattern:</Text>
				</Box>

				<TextInput value={pattern} onChange={setPattern} onSubmit={onSubmit} />
			</Box>
			</>
		);
}

function InstallView({ config }) {
	const integrationList = config.integrationList ?? [];
	const unknownLogFolderPatternList = config.unknownLogFolderPatternList ?? [];
	const customLogsPath = config.customLogsPath ?? '';

	const [installedIntegrations, setInstalledIntegrations] = useState([]);
	const [createdCustomIntegrationList, setCreatedCustomIntegrationList] = useState([]);
	const [readyToInstallAgent, setReadyToInstallAgent] = useState(false);
	const [isAgentInstalled, setIsAgentInstalled] = useState(false)
	const [agentStatus, setAgentStatus] = useState(null);

	const customIntegrationList = unknownLogFolderPatternList.map(generateCustomIntegrationConfig);

	if (customLogsPath !== '') {
		customIntegrationList.push(generateCustomIntegrationConfig(customLogsPath));
	}

	useEffect(() => {
		Promise.all([
			...integrationList.map((name) => {
				return installIntegration({ name })
					.then(() => {
						setInstalledIntegrations((prev) => [...prev, name]);
					});
			}),
			...customIntegrationList.map(({ name }) => {
				return createCustomIntegration({ name }).then(() => {
					setCreatedCustomIntegrationList((prev) => [...prev, name]);
				});
			})
		]).then(() => { setReadyToInstallAgent(true); })
	}, [])

	useEffect(() => {
		if (!readyToInstallAgent) {
			return;
		}

		let agentDownload = Promise.resolve();

		if (!fs.existsSync(`/tmp/${ELASTIC_AGENT_ARTIFACT}`)) {
			setAgentStatus('downloading');

			agentDownload = execCommand(`curl -k -L -o /tmp/${ELASTIC_AGENT_ARTIFACT}.tar.gz ${ELASTIC_AGENT_DOWNLOAD_URL}`)
				.then(() => {
					setAgentStatus('extracting');
					return execCommand(`tar -xzf /tmp/${ELASTIC_AGENT_ARTIFACT}.tar.gz -C /tmp/`);
				});
		}

		agentDownload.then(() => {
				setAgentStatus('installing');
				return execCommand(`/tmp/${ELASTIC_AGENT_ARTIFACT}/elastic-agent install -f`);
			})
			.then(() => {
				return execCommand(`
					waitForElasticAgentStatus() {
						local MAX_RETRIES=10
						local i=0
						echo -n "."
						elastic-agent status >/dev/null
						local ELASTIC_AGENT_STATUS_EXIT_CODE="$?"
						while [ "$ELASTIC_AGENT_STATUS_EXIT_CODE" -ne 0 ] && [ $i -le $MAX_RETRIES ]; do
							sleep 1
							echo -n "."
							elastic-agent status >/dev/null
							ELASTIC_AGENT_STATUS_EXIT_CODE="$?"
							((i++))
						done
						echo ""
						return $ELASTIC_AGENT_STATUS_EXIT_CODE
					}

					waitForElasticAgentStatus
				`)
			})
			.then(() => {
				const outputsConfig = generateOutputsConfig({ esHost: ES_HOST, apiKey: API_KEY });
				const customLogsInputsConfig = customIntegrationList.map(generateCustomLogsInputsConfig);
				const integrationsInputsConfig = integrationList.map(generateIntegrationInputsConfig).filter(Boolean);

				const yamlConfig = dump({
					outputs: outputsConfig,
					inputs: [
						...integrationsInputsConfig,
						...customLogsInputsConfig
					],
				})
				const configPath = '/opt/Elastic/Agent/elastic-agent.yml';

				ensureElasticAgentConfigFolder();

				fs.writeFile(configPath, yamlConfig, (err) => {
					if (err) {
						console.error('Error writing file:', err);
					}
				});
			})
			.catch(error => console.error(error))
			.finally(() => setAgentStatus('done'));

	}, [readyToInstallAgent])

	return <Box flexDirection='column'>
		<Text>Installing Integrations:</Text>
		{integrationList.map((integrationKey) => {
			let label = integrationLabelMap[integrationKey];
			let isInstalled = installedIntegrations.includes(integrationKey);

			return <Text key={integrationKey} color={isInstalled ? 'green' : 'white'}>
				{isInstalled ? '✓' : <Spinner type="dots" />}
				{' '}
				{label}
			</Text>
		})}

		<Text>Creating Custom Integrations:</Text>
		{customIntegrationList.map(({ name }) => {
			let isCreated = createdCustomIntegrationList.includes(name);

			return <Text key={name} color={isCreated ? 'green' : 'white'}>
				{isCreated ? '✓' : <Spinner type="dots" />}
				{' '}
				{name}
			</Text>
		})}

		{agentStatus === 'downloading' && (
			<Text>
				<Spinner type="dots" />
				{' '}
				Downloading Elastic Agent...
			</Text>
		)}

		{agentStatus === 'extracting' && (
			<Text>
				<Spinner type="dots" />
				{' '}
				Extracting Elastic Agent...
			</Text>
		)}

		{agentStatus === 'installing' && (
			<Text>
				<Spinner type="dots" />
				{' '}
				Installing Elastic Agent...
			</Text>
		)}

		{agentStatus === 'done' && (
			<Text color="green">
				✨
				{' '}
				Elastic Agent is running. Go to https://127.0.0.1:5601/app/observability-logs-explorer to view your logs.
			</Text>
		)}




	</Box>;
}

function OnboardingCLI() {
	const [openFileList, setOpenFileList] = useState(null);
	const [config, setConfig] = useState({});
	const [currentView, setCurrentView] = useState(null);

	useEffect(() => {
		readOpenFiles().then((openFileList) => {
			setOpenFileList(openFileList);
			setCurrentView(VIEW.INTEGRATIONS);
		});
	}, [])

	const onIntegrationListSubmit = useCallback((selectedIntegrationList) => {
		setConfig((prev) => ({
			...prev,
			integrationList: selectedIntegrationList,
		}));
		setCurrentView(VIEW.UNKNOWN_LOGS);
	}, []);

	const onUnknownLogFolderPatternListSubmit = useCallback((selectedUnknownLogFolderPatternList) => {
		setConfig((prev) => ({
			...prev,
			unknownLogFolderPatternList: selectedUnknownLogFolderPatternList,
		}));
		setCurrentView(VIEW.CUSTOM_LOGS);
	}, []);

	const onCustomLogsSubmit = useCallback((customLogsPath) => {
		setConfig((prev) => ({
			...prev,
			customLogsPath,
		}));
		setCurrentView(VIEW.INSTALL);
	}, []);

	if (openFileList === null) {
		return <Text color="green"><Spinner type="dots" /> Looking for logs...</Text>
	}

	const { integrationList, unknownFileList } = detectKnownIntegrations(openFileList);
	const folderPatternList = generateFolderPatternList(unknownFileList);

	switch (currentView) {
		case VIEW.INTEGRATIONS:
			return <IntegrationListView integrationList={integrationList} onSubmit={onIntegrationListSubmit} />;
		case VIEW.UNKNOWN_LOGS:
			return <UnknownLogFolderListView folderPatternList={folderPatternList} onSubmit={onUnknownLogFolderPatternListSubmit} />;
		case VIEW.CUSTOM_LOGS:
			return <CustomLogsView onSubmit={onCustomLogsSubmit} />;
		case VIEW.INSTALL:
			return <InstallView config={config} />;
	}
};

render(<OnboardingCLI />);
