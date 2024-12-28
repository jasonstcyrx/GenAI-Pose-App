import { useState, useEffect, useCallback, useMemo } from 'react';

const useCollectJoints = (onRun: boolean = false) => {
    const [jointPositions, setJointPositions] = useState<number[][]>([]);
    const [fetchNext, setFetchNext] = useState<boolean>(false);

    const collectJointPositions = useCallback(() => {
        // Simulate collecting joint positions (360*3 tensor)
        const newJointPositions = Array.from({ length: 360 }, () =>
            Array.from({ length: 3 }, () => Math.random())
        );
        setJointPositions((prevPositions) => [...prevPositions, ...newJointPositions]);
    }, []);

    useEffect(() => {
        if (fetchNext) {
            collectJointPositions();
            setFetchNext(false);
        }
    }, [fetchNext, collectJointPositions]);

    const fetchNextJointPositions = useCallback(() => {
        setFetchNext(true);
    }, []);

    return useMemo(() => ({ jointPositions, fetchNextJointPositions }), [jointPositions, fetchNextJointPositions]);
};

export default useCollectJoints;