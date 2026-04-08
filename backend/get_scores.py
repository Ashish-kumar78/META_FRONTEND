from env import SatelliteSchedulingEnv
from graders import grade

for diff in ['easy','medium','hard']:
    env = SatelliteSchedulingEnv(difficulty=diff, seed=42)
    obs = env.reset()
    done = False
    p = {'critical':4,'high':3,'medium':2,'low':1}
    while not done:
        execs = [s for s in obs['satellites'] if s['active'] and s['role']=='executor' and s['battery']>5]
        pending = sorted(
            [t for t in obs['tasks'] if not t['completed'] and not t['assigned_to']],
            key=lambda t: p.get(t['priority'],0), reverse=True
        )
        action = {'type':'skip'}
        for ex in execs:
            for t in pending:
                if ex['battery']>=t['battery_cost'] and ex['storage_used']+t['storage_cost']<=100:
                    action = {'type':'assign_task','satellite_id':ex['id'],'task_id':t['id']}
                    break
            if action['type']!='skip':
                break
        obs, r, done, _ = env.step(action)
    result = grade(diff, env.get_state())
    print(diff + ': score=' + str(result['score']) + ' breakdown=' + str(result['breakdown']))
